import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

import { DownloadedFile, StoredFile, StorageProvider, StorageUploadInput } from "./types";

export class SupabaseStorageProvider implements StorageProvider {
  private client;
  private bucket: string;

  constructor() {
    this.client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    this.bucket = env.SUPABASE_STORAGE_BUCKET;
  }

  async upload(file: StorageUploadInput): Promise<StoredFile> {
    const { error } = await this.client.storage.from(this.bucket).upload(file.fileName, file.body, {
      contentType: file.contentType,
      upsert: true
    });
    if (error) throw error;

    return {
      key: file.fileName,
      fileName: file.fileName,
      contentType: file.contentType,
      sizeBytes: Buffer.isBuffer(file.body) ? file.body.byteLength : file.body.size
    };
  }

  async download(key: string): Promise<DownloadedFile> {
    const { data, error } = await this.client.storage.from(this.bucket).download(key);
    if (error) throw error;

    return {
      body: Buffer.from(await data.arrayBuffer()),
      contentType: data.type || "application/octet-stream"
    };
  }

  async getUrl(key: string, expiresInSec = 3600): Promise<string> {
    const { data, error } = await this.client.storage.from(this.bucket).createSignedUrl(key, expiresInSec);
    if (error || !data.signedUrl) throw error || new Error("Failed to generate signed URL");
    return data.signedUrl;
  }

  async delete(key: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([key]);
    if (error) throw error;
  }
}
