import { FileKind } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";

import { requireApiSession } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { uploadMimeTypes } from "@/lib/constants";
import { db } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { ensureQueueStarted, queue, queueNames } from "@/lib/queue";
import { storageProvider } from "@/lib/storage";
import { fileToBuffer, validateUpload } from "@/lib/uploads";

export async function GET(request: NextRequest, { params }: { params: Promise<{ candidateId: string }> }) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;
  const { candidateId } = await params;
  const fileId = request.nextUrl.searchParams.get("fileId");
  const preview = request.nextUrl.searchParams.get("preview") === "1";

  if (!fileId) {
    return fail("fileId is required", 400);
  }

  const file = await db.candidateFile.findFirst({
    where: {
      id: fileId,
      candidateId,
      candidate: { organizationId: auth.session.organizationId, deletedAt: null }
    }
  });

  if (!file) {
    return fail("File not found", 404);
  }

  const downloaded = await storageProvider.download(file.storageKey);
  return new NextResponse(new Uint8Array(downloaded.body), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="${file.fileName}"`
    }
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ candidateId: string }> }) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;
  const { candidateId } = await params;

  const candidate = await db.candidate.findFirst({
    where: { id: candidateId, organizationId: auth.session.organizationId, deletedAt: null }
  });

  if (!candidate) {
    return fail("Candidate not found", 404);
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = String(formData.get("kind") ?? "");

  if (!(file instanceof File)) {
    return fail("File upload is required", 400);
  }

  if (kind !== "cv" && kind !== "voice") {
    return fail("Invalid file kind", 400);
  }

  try {
    const isCv = kind === "cv";
    const fileKind = isCv ? FileKind.CV : FileKind.VOICE_NOTE;
    validateUpload(file, isCv ? uploadMimeTypes.cv : uploadMimeTypes.voice);
    const buffer = await fileToBuffer(file);
    const stored = await storageProvider.upload({
      fileName: `candidates/${candidate.id}/${isCv ? "cv" : "voice"}/${file.name}`,
      contentType: file.type,
      body: buffer
    });

    const previousFiles = (candidate.files ?? []).filter((item: { kind: string }) => item.kind === fileKind);
    const savedFile = await db.candidateFile.create({
      data: {
        candidateId: candidate.id,
        kind: fileKind,
        fileName: stored.fileName,
        mimeType: stored.contentType,
        storageKey: stored.key,
        sizeBytes: stored.sizeBytes
      }
    });

    if (previousFiles.length) {
      await db.candidate.update({
        where: { id: candidate.id },
        data: {
          files: [...(candidate.files ?? []).filter((item: { kind: string }) => item.kind !== fileKind), savedFile]
        }
      });

      for (const previousFile of previousFiles) {
        await storageProvider.delete(previousFile.storageKey).catch(() => undefined);
      }
    }

    await ensureQueueStarted();
    await queue.send(isCv ? queueNames.cvAnalysis : queueNames.voiceAnalysis, {
      candidateId: candidate.id,
      organizationId: auth.session.organizationId
    });

    await createAuditLog({
      organizationId: auth.session.organizationId,
      userId: auth.session.id,
      action: isCv ? "candidate.cv_uploaded" : "candidate.voice_uploaded",
      entityType: "candidate",
      entityId: candidate.id,
      meta: { fileId: savedFile.id, fileName: savedFile.fileName }
    });

    return ok(savedFile, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Upload failed", 400);
  }
}
