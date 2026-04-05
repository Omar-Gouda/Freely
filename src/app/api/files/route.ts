import { NextRequest } from "next/server";

import { requireApiSession } from "@/lib/api-auth";
import { fail, ok } from "@/lib/http";
import { storageProvider } from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiSession(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("key");
    if (!fileName) return fail("Missing fileName", 400);

    const expiresInSec = Number(searchParams.get("expiresIn") ?? "3600");
    const url = await storageProvider.getUrl(fileName, expiresInSec);

    return ok({ url });
  } catch (error) {
    console.error("File URL error:", error);
    return fail("Failed to get file URL", 500);
  }
}
