export type StorageUploadInput = {
  fileName: string;
  contentType: string;
  body: Buffer | Blob;
};

export type StoredFile = {
  key: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

export type DownloadedFile = {
  body: Buffer;
  contentType: string;
};

export interface StorageProvider {
  upload(file: StorageUploadInput): Promise<StoredFile>;
  download(key: string): Promise<DownloadedFile>;
  getUrl(key: string, expiresInSec?: number): Promise<string>;
  delete(key: string): Promise<void>;
}
