import { NextRequest, NextResponse } from "next/server";

import { requireApiSession } from "@/lib/api-auth";
import { storageProvider } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileName: string }> }
) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return NextResponse.json(auth.error, { status: 401 });

  const { fileName } = await params;

  try {
    const downloaded = await storageProvider.download(fileName);
    return new NextResponse(new Uint8Array(downloaded.body), {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Type": downloaded.contentType
      }
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
