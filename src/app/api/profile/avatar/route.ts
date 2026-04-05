import { NextRequest, NextResponse } from "next/server";

import { requireApiSession } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
import { storageProvider } from "@/lib/storage";

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;

  const userId = request.nextUrl.searchParams.get("userId") || auth.session.id;
  const user = await db.user.findFirst({
    where: {
      id: userId,
      organizationId: auth.session.organizationId,
      deletedAt: null
    },
    select: { avatarStorageKey: true }
  });

  if (!user?.avatarStorageKey) {
    return fail("Avatar not found", 404);
  }

  const downloaded = await storageProvider.download(user.avatarStorageKey);
  return new NextResponse(new Uint8Array(downloaded.body), {
    headers: {
      "Content-Type": downloaded.contentType,
      "Cache-Control": "private, max-age=60"
    }
  });
}
