import { randomUUID } from "crypto";

import { db } from "@/lib/db";
import { CandidateStage, JobStatus, NotificationKind, Role } from "@/lib/models";

async function main() {
  const organizationSlug = "freely-demo";
  const userEmail = "admin@freely.local";
  const candidateEmail = "candidate@freely.local";

  const organization =
    (await db.organization.findFirst({ where: { slug: organizationSlug } })) ??
    (await db.organization.create({
      data: {
        id: randomUUID(),
        name: "Freely Demo",
        slug: organizationSlug
      }
    }));

  const user =
    (await db.user.findFirst({
      where: {
        organizationId: organization.id,
        email: userEmail,
        deletedAt: null
      }
    })) ??
    (await db.user.create({
      data: {
        organizationId: organization.id,
        email: userEmail,
        passwordHash: "",
        fullName: "Freely Admin",
        role: Role.ADMIN
      }
    }));

  const job =
    (await db.job.findFirst({
      where: {
        organizationId: organization.id,
        title: "Senior Talent Partner",
        deletedAt: null
      }
    })) ??
    (await db.job.create({
      data: {
        organizationId: organization.id,
        createdById: user.id,
        title: "Senior Talent Partner",
        rawDescription: "Own candidate pipelines, recruiter coordination, and stakeholder updates across high-volume hiring campaigns.",
        status: JobStatus.OPEN,
        headcount: 3,
        location: "Remote"
      }
    }));

  const candidate =
    (await db.candidate.findFirst({
      where: {
        organizationId: organization.id,
        email: candidateEmail,
        deletedAt: null
      }
    })) ??
    (await db.candidate.create({
      data: {
        organizationId: organization.id,
        jobId: job.id,
        firstName: "Amina",
        lastName: "Hassan",
        email: candidateEmail,
        source: "Seed",
        stage: CandidateStage.APPLIED,
        yearsExperience: 5,
        skills: ["Sourcing", "Interview Coordination", "ATS"],
        notes: "Seeded demo candidate for local QA and setup verification.",
        stageEvents: {
          create: {
            toStage: CandidateStage.APPLIED,
            reason: "Seeded demo data"
          }
        }
      }
    }));

  const existingNotifications = await db.notification.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
    take: 1
  });

  if (!existingNotifications.length) {
    await db.notification.create({
      data: {
        id: randomUUID(),
        organizationId: organization.id,
        kind: NotificationKind.SYSTEM,
        title: "Demo workspace seeded",
        message: "Supabase Postgres demo data is ready.",
        isRead: false,
        createdAt: new Date()
      }
    });
  }

  console.log("Database seed completed");
  console.log(JSON.stringify({
    organizationId: organization.id,
    userId: user.id,
    jobId: job.id,
    candidateId: candidate.id
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
