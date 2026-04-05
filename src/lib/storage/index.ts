import { env } from "@/lib/env";
import { LocalStorageProvider } from "@/lib/storage/local";
import { S3StorageProvider } from "@/lib/storage/s3";
import { SupabaseStorageProvider } from "@/lib/storage/supabase";

/**
 * Factory to return the correct storage provider
 * Throws a clear error if the provider is misconfigured
 */
export function createStorageProvider() {
  switch (env.STORAGE_DRIVER) {
    case "s3":
      if (!env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
        throw new Error("S3 storage selected but S3_ACCESS_KEY_ID or S3_SECRET_ACCESS_KEY is missing");
      }
      return new S3StorageProvider();

    case "supabase":
      if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Supabase storage selected but NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing");
      }
      return new SupabaseStorageProvider();

    case "local":
      return new LocalStorageProvider();

    default:
      throw new Error(`Unknown STORAGE_DRIVER: ${env.STORAGE_DRIVER}`);
  }
}

/**
 * Default storage instance
 */
export const storageProvider = createStorageProvider();
