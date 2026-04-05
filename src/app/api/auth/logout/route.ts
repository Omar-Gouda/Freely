import { signOutSession } from "@/lib/auth";
import { ok } from "@/lib/http";

export async function POST() {
  await signOutSession();
  return ok({ success: true });
}
