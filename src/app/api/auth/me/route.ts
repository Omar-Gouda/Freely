import { getSession } from "@/lib/auth";
import { fail, ok } from "@/lib/http";

export async function GET() {
  const session = await getSession();
  return session ? ok(session) : fail("Unauthorized", 401);
}
