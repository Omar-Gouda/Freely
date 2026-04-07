import { randomUUID } from "crypto";
import path from "path";

import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { env } from "@/lib/env";

import { DownloadedFile, StoredFile, StorageProvider, StorageUploadInput } from "./types";

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "file";
}

function buildStorageKey(fileName: string) {
  const normalized = fileName.replace(/\\/g, "/").split("/").filter(Boolean);
  const folders = normalized.slice(0, -1).map(sanitizeSegment).filter(Boolean);
  const parsed = path.parse(normalized[normalized.length - 1] ?? fileName);
  const safeBase = sanitizeSegment(parsed.name).slice(0, 80) || "file";
  const extension = parsed.ext.replace(/[^.a-zA-Z0-9]/g, "").slice(0, 12);
  const key = `${safeBase}-${randomUUID()}${extension || ""}`;
  return folders.length ? `${folders.join("/")}/${key}` : key;
}

export class SupabaseStorageProvider implements StorageProvider {
  private client;
  private bucket: string;
  private bucketReady: Promise<void> | null = null;

  constructor() {
    this.client = createSupabaseAdminClient();
    this.bucket = env.SUPABASE_STORAGE_BUCKET;
  }

  private async ensureBucket() {
    if (!this.bucketReady) {
      this.bucketReady = (async () => {
        const { data, error } = await this.client.storage.getBucket(this.bucket);
        if (!error && data) {
          return;
        }

        const message = error?.message ?? "Unknown Supabase storage error";
        if (!/bucket not found/i.test(message)) {
          throw new Error(message);
        }

        const { error: createError } = await this.client.storage.createBucket(this.bucket, {
          public: false,
          fileSizeLimit: `${env.MAX_UPLOAD_SIZE_MB}MB`
        });

        if (createError && !/already exists/i.test(createError.message)) {
          throw new Error(`Supabase bucket \"${this.bucket}\" could not be created automatically: ${createError.message}`);
        }
      })().catch((error) => {
        this.bucketReady = null;
        throw error;
      });
    }

    return this.bucketReady;
  }

  async upload(file: StorageUploadInput): Promise<StoredFile> {
    await this.ensureBucket();

    const key = buildStorageKey(file.fileName);
    const body = Buffer.isBuffer(file.body) ? file.body : file.body;
    const { error } = await this.client.storage.from(this.bucket).upload(key, body, {
      contentType: file.contentType,
      upsert: false
    });
    if (error) throw new Error(error.message);

    return {
      key,
      fileName: path.basename(file.fileName),
      contentType: file.contentType,
      sizeBytes: Buffer.isBuffer(file.body) ? file.body.byteLength : file.body.size
    };
  }

  async download(key: string): Promise<DownloadedFile> {
    await this.ensureBucket();

    const { data, error } = await this.client.storage.from(this.bucket).download(key);
    if (error) throw new Error(error.message);

    return {
      body: Buffer.from(await data.arrayBuffer()),
      contentType: data.type || "application/octet-stream"
    };
  }

  async getUrl(key: string, expiresInSec = 3600): Promise<string> {
    await this.ensureBucket();

    const { data, error } = await this.client.storage.from(this.bucket).createSignedUrl(key, expiresInSec);
    if (error || !data.signedUrl) throw error || new Error("Failed to generate signed URL");
    return data.signedUrl;
  }

  async delete(key: string): Promise<void> {
    await this.ensureBucket();

    const { error } = await this.client.storage.from(this.bucket).remove([key]);
    if (error && !/not found/i.test(error.message)) {
      throw new Error(error.message);
    }
  }
}
