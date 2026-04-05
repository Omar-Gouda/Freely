import { NextRequest } from "next/server";

import { requireApiSession } from "@/lib/api-auth";
import { uploadMimeTypes } from "@/lib/constants";
import { fail, ok } from "@/lib/http";
import { parseResumeText } from "@/lib/resume-parser";
import { extractTextFromCv, fileToBuffer, validateUpload } from "@/lib/uploads";

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request);
  if ("error" in auth) return auth.error;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return fail("Resume file is required", 400);
  }

  validateUpload(file, uploadMimeTypes.cv);
  const buffer = await fileToBuffer(file);
  const resumeText = await extractTextFromCv(buffer, file.type);
  const parsed = parseResumeText(resumeText);

  return ok({
    ...parsed,
    resumeText
  });
}