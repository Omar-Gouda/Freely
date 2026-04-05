import mammoth from "mammoth";
import pdfParse from "pdf-parse";

import { env } from "@/lib/env";

export async function fileToBuffer(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function validateUpload(file: File, acceptedMimeTypes: string[]) {
  const maxBytes = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;

  if (!acceptedMimeTypes.includes(file.type)) {
    throw new Error("Unsupported file type");
  }

  if (file.size > maxBytes) {
    throw new Error(`File exceeds ${env.MAX_UPLOAD_SIZE_MB}MB limit`);
  }
}

export async function extractTextFromCv(buffer: Buffer, mimeType: string) {
  if (mimeType === "application/pdf") {
    const result = await pdfParse(buffer);
    return result.text;
  }

  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
