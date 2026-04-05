import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

import { DownloadedFile, StoredFile, StorageProvider, StorageUploadInput } from "./types";

const STORAGE_DIR = path.resolve("./storage");

function buildSafeKey(fileName: string) {
  const parsed = path.parse(path.basename(fileName));
  const safeBase = parsed.name.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 80) || "file";
  return `${safeBase}-${randomUUID()}${parsed.ext}`;
}

export class LocalStorageProvider implements StorageProvider {
  private initialized = false;

  private async init() {
    if (this.initialized) return;

    await fs.mkdir(STORAGE_DIR, { recursive: true }).catch((err) => {
      console.error("Failed to create storage dir:", err);
      throw err;
    });

    this.initialized = true;
  }

  constructor() {
    this.init().catch((err) => {
      console.error("LocalStorage init failed:", err);
    });
  }

  async upload(file: StorageUploadInput): Promise<StoredFile> {
    await this.init();

    const key = buildSafeKey(file.fileName);
    const filePath = path.join(STORAGE_DIR, key);
    const metaPath = `${filePath}.meta.json`;
    const body = Buffer.isBuffer(file.body) ? file.body : Buffer.from(await file.body.arrayBuffer());

    await fs.writeFile(filePath, body);
    await fs.writeFile(metaPath, JSON.stringify({ contentType: file.contentType, originalFileName: file.fileName }, null, 2));

    return {
      key,
      fileName: file.fileName,
      contentType: file.contentType,
      sizeBytes: body.length
    };
  }

  async download(key: string): Promise<DownloadedFile> {
    await this.init();

    const safeKey = path.basename(key);
    const filePath = path.join(STORAGE_DIR, safeKey);
    const metaPath = `${filePath}.meta.json`;
    const body = await fs.readFile(filePath);

    let contentType = "application/octet-stream";

    try {
      const meta = JSON.parse(await fs.readFile(metaPath, "utf8")) as { contentType?: string };
      if (meta.contentType) {
        contentType = meta.contentType;
      }
    } catch {
      // Older local files may not have metadata sidecars yet.
    }

    return { body, contentType };
  }

  async getUrl(key: string): Promise<string> {
    return `/api/files/${encodeURIComponent(path.basename(key))}`;
  }

  async delete(key: string): Promise<void> {
    const safeKey = path.basename(key);
    const filePath = path.join(STORAGE_DIR, safeKey);
    const metaPath = `${filePath}.meta.json`;

    await fs.unlink(filePath).catch((err) => {
      console.warn(`Failed to delete ${safeKey}:`, err);
    });
    await fs.unlink(metaPath).catch(() => undefined);
  }
}
