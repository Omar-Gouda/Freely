import { Pool } from "pg";

import { env } from "@/lib/env";
import { log } from "@/lib/logger";

type PersistedRecord = { _id: string } & Record<string, unknown>;

declare global {
  var appDocumentPool: Pool | undefined;
  var appDocumentSchemaPromise: Promise<void> | undefined;
}

const connectionString = env.DATABASE_URL || env.DIRECT_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or DIRECT_URL must be configured to use Supabase Postgres storage.");
}

const pool = global.appDocumentPool ?? new Pool({
  connectionString,
  max: 5,
  ssl: connectionString.includes("supabase.com") || connectionString.includes("pooler.supabase.com")
    ? { rejectUnauthorized: false }
    : undefined
});

if (!global.appDocumentPool) {
  global.appDocumentPool = pool;
}

async function ensureSchema() {
  if (!global.appDocumentSchemaPromise) {
    global.appDocumentSchemaPromise = pool.query(`
      create table if not exists app_documents (
        collection text not null,
        id text not null,
        payload jsonb not null,
        created_at timestamptz not null default timezone('utc', now()),
        updated_at timestamptz not null default timezone('utc', now()),
        primary key (collection, id)
      );

      create index if not exists app_documents_collection_idx
        on app_documents (collection);

      create index if not exists app_documents_collection_updated_idx
        on app_documents (collection, updated_at desc);
    `).then(() => {
      log("info", "Supabase Postgres document storage is ready", { collectionTable: "app_documents" });
    }).catch((error) => {
      global.appDocumentSchemaPromise = undefined;
      throw error;
    });
  }

  return global.appDocumentSchemaPromise;
}

function reviveDates(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reviveDates);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, reviveDates(nested)])
    );
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) {
    return new Date(value);
  }

  return value;
}

function serializeRecord(doc: PersistedRecord) {
  return JSON.parse(JSON.stringify(doc));
}

function hydrateRecord<T extends PersistedRecord>(payload: unknown): T {
  return reviveDates(payload) as T;
}

export async function readCollection<T extends PersistedRecord>(name: string): Promise<T[]> {
  await ensureSchema();
  const result = await pool.query<{ payload: T }>(
    `select payload
     from app_documents
     where collection = $1
     order by updated_at asc, id asc`,
    [name]
  );

  return result.rows.map((row) => hydrateRecord<T>(row.payload));
}

export async function insertDocument<T extends PersistedRecord>(name: string, doc: T): Promise<T> {
  await ensureSchema();
  await pool.query(
    `insert into app_documents (collection, id, payload, created_at, updated_at)
     values ($1, $2, $3::jsonb, coalesce(($3::jsonb ->> 'createdAt')::timestamptz, timezone('utc', now())), coalesce(($3::jsonb ->> 'updatedAt')::timestamptz, timezone('utc', now())))
     on conflict (collection, id) do nothing`,
    [name, doc._id, JSON.stringify(serializeRecord(doc))]
  );

  return doc;
}

export async function replaceDocument<T extends PersistedRecord>(name: string, doc: T): Promise<T> {
  await ensureSchema();
  await pool.query(
    `insert into app_documents (collection, id, payload, created_at, updated_at)
     values ($1, $2, $3::jsonb, coalesce(($3::jsonb ->> 'createdAt')::timestamptz, timezone('utc', now())), coalesce(($3::jsonb ->> 'updatedAt')::timestamptz, timezone('utc', now())))
     on conflict (collection, id)
     do update set payload = excluded.payload, updated_at = excluded.updated_at`,
    [name, doc._id, JSON.stringify(serializeRecord(doc))]
  );

  return doc;
}

export async function deleteDocument(name: string, id: string) {
  await ensureSchema();
  await pool.query(
    `delete from app_documents where collection = $1 and id = $2`,
    [name, id]
  );
}
