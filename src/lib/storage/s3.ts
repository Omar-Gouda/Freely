import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "stream";

import { env } from "@/lib/env";

import { DownloadedFile, StoredFile, StorageProvider, StorageUploadInput } from "./types";

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY
      }
    });
    this.bucket = env.S3_BUCKET;
  }

  async upload(file: StorageUploadInput): Promise<StoredFile> {
    const body = Buffer.isBuffer(file.body) ? file.body : Buffer.from(await file.body.arrayBuffer());

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: file.fileName,
        Body: body,
        ContentType: file.contentType
      })
    );

    return {
      key: file.fileName,
      fileName: file.fileName,
      contentType: file.contentType,
      sizeBytes: body.length
    };
  }

  async download(key: string): Promise<DownloadedFile> {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const chunks: Buffer[] = [];

    for await (const chunk of response.Body as Readable) {
      chunks.push(Buffer.from(chunk));
    }

    return {
      body: Buffer.concat(chunks),
      contentType: response.ContentType ?? "application/octet-stream"
    };
  }

  async getUrl(key: string, expiresInSec = 3600): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresInSec
    });
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
