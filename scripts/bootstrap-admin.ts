import { createClient } from "@supabase/supabase-js";

import { db } from "@/lib/db";
import { Role } from "@/lib/models";

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be configured.`);
  }

  return value;
}

function toSlug(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `workspace-${Date.now()}`;
}

async function getUniqueSlug(baseName: string) {
  const baseSlug = toSlug(baseName);
  let nextSlug = baseSlug;
  let suffix = 1;

  while (await db.organization.findFirst({ where: { slug: nextSlug } })) {
    suffix += 1;
    nextSlug = `${baseSlug}-${suffix}`;
  }

  return nextSlug;
}

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");
  const email = requireEnv("ADMIN_EMAIL").toLowerCase();
  const password = requireEnv("ADMIN_PASSWORD");

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(error?.message ?? "Supabase sign-in failed.");
  }

  const metadata = data.user.user_metadata ?? {};
  const fullName = typeof metadata.full_name === "string" && metadata.full_name.trim()
    ? metadata.full_name.trim()
    : "Freely Admin";
  const workspaceName = typeof metadata.workspace_name === "string" && metadata.workspace_name.trim()
    ? metadata.workspace_name.trim()
    : "Freely Admin Workspace";

  let organizationId: string;
  let user = await db.user.findFirst({
    where: {
      OR: [{ supabaseAuthId: data.user.id }, { email }],
      deletedAt: null
    }
  });

  if (!user) {
    const organization = await db.organization.create({
      data: {
        name: workspaceName,
        slug: await getUniqueSlug(workspaceName)
      }
    });

    user = await db.user.create({
      data: {
        organizationId: organization.id,
        supabaseAuthId: data.user.id,
        email,
        passwordHash: "",
        fullName,
        role: Role.ADMIN
      }
    });
    organizationId = organization.id;
  } else {
    organizationId = user.organizationId;
    if (user.role !== Role.ADMIN || user.supabaseAuthId !== data.user.id || user.fullName !== fullName) {
      user = await db.user.update({
        where: { id: user.id },
        data: {
          role: Role.ADMIN,
          supabaseAuthId: data.user.id,
          fullName,
          email
        }
      });
    }
  }

  console.log(JSON.stringify({
    success: true,
    email,
    organizationId,
    userId: user.id,
    role: user.role,
    workspaceName
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
