import { randomUUID } from "crypto";

import { insertDocument, readCollection, replaceDocument } from "@/lib/persistence";
import type {
  AuditLog,
  Candidate,
  CandidateFileRecord,
  CandidateStageEventRecord,
  GeneratedJobAdRecord,
  InterviewBooking,
  InterviewSlot,
  Job,
  Notification,
  Organization,
  OutreachTemplate,
  QueueJob,
  SupportThread,
  User
} from "@/lib/models";

const collectionNames = {
  organizations: "organizations",
  users: "users",
  jobs: "jobs",
  candidates: "candidates",
  interviewSlots: "interviewSlots",
  interviewBookings: "interviewBookings",
  notifications: "notifications",
  supportThreads: "supportThreads",
  outreachTemplates: "outreachTemplates",
  auditLogs: "auditLogs",
  queueJobs: "queueJobs"
} as const;

type Where = Record<string, unknown> | undefined;
type OrderBy = Record<string, "asc" | "desc"> | Array<Record<string, "asc" | "desc">> | undefined;

function now() {
  return new Date();
}

function stripMongoId<T extends { _id?: unknown }>(value: T): Omit<T, "_id"> {
  const rest = { ...value };
  delete rest._id;
  return rest;
}

async function fetchAll<T>(name: string): Promise<Array<T & { _id: string }>> {
  return readCollection<T & { _id: string }>(name);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function matchesValue(value: unknown, condition: unknown): boolean {
  if (condition === undefined) {
    return true;
  }

  if (condition === null) {
    return value === null || value === undefined;
  }

  if (isPlainObject(condition)) {
    if ("in" in condition && Array.isArray(condition.in)) {
      return condition.in.includes(value);
    }

    if ("not" in condition) {
      return !matchesValue(value, condition.not);
    }

    if ("lt" in condition && value instanceof Date) {
      return value < new Date(String(condition.lt));
    }

    if ("gt" in condition && value instanceof Date) {
      return value > new Date(String(condition.gt));
    }

    if ("lt" in condition && typeof value === "number") {
      return value < Number(condition.lt);
    }

    if ("gt" in condition && typeof value === "number") {
      return value > Number(condition.gt);
    }
  }

  return value === condition;
}

function matchesWhere<T extends Record<string, unknown>>(doc: T, where?: Where): boolean {
  if (!where) {
    return true;
  }

  for (const [key, value] of Object.entries(where)) {
    if (key === "OR" && Array.isArray(value)) {
      if (!value.some((item) => matchesWhere(doc, item as Where))) {
        return false;
      }
      continue;
    }

    if (key === "AND" && Array.isArray(value)) {
      if (!value.every((item) => matchesWhere(doc, item as Where))) {
        return false;
      }
      continue;
    }

    if (!matchesValue(doc[key], value)) {
      return false;
    }
  }

  return true;
}

function sortDocs<T extends Record<string, unknown>>(docs: T[], orderBy?: OrderBy) {
  if (!orderBy) {
    return docs;
  }

  const rules = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...docs].sort((left, right) => {
    for (const rule of rules) {
      const [field, direction] = Object.entries(rule)[0] ?? [];
      if (!field) continue;

      const leftValue = left[field];
      const rightValue = right[field];
      if (leftValue === rightValue) continue;

      const multiplier = direction === "desc" ? -1 : 1;
      if (leftValue instanceof Date && rightValue instanceof Date) {
        return (leftValue.getTime() - rightValue.getTime()) * multiplier;
      }

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return (leftValue - rightValue) * multiplier;
      }

      return String(leftValue).localeCompare(String(rightValue)) * multiplier;
    }

    return 0;
  });
}

function takeDocs<T>(docs: T[], take?: number) {
  return typeof take === "number" ? docs.slice(0, take) : docs;
}

function countDocs<T extends Record<string, unknown>>(docs: T[], where?: Where) {
  return docs.filter((item) => matchesWhere(item, where)).length;
}

function project<T extends Record<string, unknown>>(doc: T, select?: Record<string, unknown>) {
  if (!select) {
    return doc;
  }

  const result: Record<string, unknown> = {};

  for (const [key, spec] of Object.entries(select)) {
    if (!spec) continue;

    if (spec === true) {
      result[key] = doc[key];
      continue;
    }

    if (isPlainObject(spec) && "select" in spec) {
      const source = doc[key];
      if (Array.isArray(source)) {
        result[key] = source.map((item) => (isPlainObject(item) ? project(item, spec.select as Record<string, unknown>) : item));
      } else if (isPlainObject(source)) {
        result[key] = project(source, spec.select as Record<string, unknown>);
      } else {
        result[key] = source;
      }
      continue;
    }

    result[key] = doc[key];
  }

  return result;
}

function normalizeOrganization(organization: Organization): Organization {
  return {
    ...organization,
    status: organization.status ?? "ACTIVE",
    requestedByEmail: organization.requestedByEmail ?? null,
    approvedAt: organization.approvedAt ?? null,
    approvedById: organization.approvedById ?? null,
    approvalNotes: organization.approvalNotes ?? null,
    deactivatedAt: organization.deactivatedAt ?? null,
    contractEndsAt: organization.contractEndsAt ?? null,
    deletedAt: organization.deletedAt ?? null
  };
}
function normalizeJob(job: Job): Job {
  return {
    ...job,
    assignedRecruiterId: job.assignedRecruiterId ?? null,
    assignmentHistory: job.assignmentHistory ?? [],
    candidateIds: job.candidateIds ?? [],
    generatedAds: job.generatedAds ?? []
  };
}
async function listOrganizations() {
  return (await fetchAll<Organization>(collectionNames.organizations)).map(stripMongoId).map(normalizeOrganization);
}

async function listUsers() {
  return (await fetchAll<User>(collectionNames.users)).map(stripMongoId);
}

async function listJobs() {
  return (await fetchAll<Job>(collectionNames.jobs)).map(stripMongoId).map(normalizeJob);
}

async function listCandidates() {
  return (await fetchAll<Candidate>(collectionNames.candidates)).map(stripMongoId);
}

async function listInterviewSlots() {
  return (await fetchAll<InterviewSlot>(collectionNames.interviewSlots)).map(stripMongoId);
}

async function listInterviewBookings() {
  return (await fetchAll<InterviewBooking>(collectionNames.interviewBookings)).map(stripMongoId);
}

async function listNotifications() {
  return (await fetchAll<Notification>(collectionNames.notifications)).map(stripMongoId);
}

async function listSupportThreads() {
  return (await fetchAll<SupportThread>(collectionNames.supportThreads)).map(stripMongoId);
}

async function listOutreachTemplates() {
  return (await fetchAll<OutreachTemplate>(collectionNames.outreachTemplates)).map(stripMongoId);
}

async function insertOne<T extends { id: string }>(name: string, doc: T) {
  const mongoDoc = { _id: doc.id, ...doc } as T & { _id: string };
  await insertDocument(name, mongoDoc);
  return doc;
}

async function replaceOne<T extends { id: string }>(name: string, doc: T) {
  const mongoDoc = { _id: doc.id, ...doc } as T & { _id: string };
  await replaceDocument(name, mongoDoc);
  return doc;
}
async function getJobCandidatesCount(jobId: string) {
  const candidates = await listCandidates();
  return candidates.filter((candidate) => candidate.jobId === jobId && !candidate.deletedAt).length;
}

async function enrichJob(job: Job, options?: { include?: Record<string, unknown>; select?: Record<string, unknown> }) {
  const base: Record<string, unknown> = { ...job };

  if (options?.include && "generatedAds" in options.include) {
    base.generatedAds = job.generatedAds ?? [];
  }

  if (options?.include && "candidates" in options.include) {
    const candidates = await listCandidates();
    base.candidates = candidates.filter((candidate) => candidate.jobId === job.id && !candidate.deletedAt);
  }

  if ((options?.include && "_count" in options.include) || (options?.select && "_count" in options.select)) {
    base._count = { candidates: await getJobCandidatesCount(job.id) };
  }

  return options?.select ? project(base, options.select) : base;
}

async function enrichCandidate(candidate: Candidate, options?: { include?: Record<string, unknown>; select?: Record<string, unknown> }) {
  const base: Record<string, unknown> = { ...candidate };

  if (options?.include && "job" in options.include) {
    const jobs = await listJobs();
    base.job = jobs.find((job) => job.id === candidate.jobId) ?? null;
  }

  if (options?.include && "files" in options.include) {
    base.files = candidate.files ?? [];
  }

  if (options?.select && "job" in options.select) {
    const jobs = await listJobs();
    const job = jobs.find((item) => item.id === candidate.jobId) ?? null;
    const jobSelect = isPlainObject(options.select.job) && isPlainObject(options.select.job.select)
      ? (options.select.job.select as Record<string, unknown>)
      : undefined;
    base.job = job && jobSelect ? project(job as Record<string, unknown>, jobSelect) : job;
  }

  return options?.select ? project(base, options.select) : base;
}

async function enrichInterviewSlot(slot: InterviewSlot, options?: { include?: Record<string, unknown>; select?: Record<string, unknown> }) {
  const base: Record<string, unknown> = { ...slot };

  if (options?.include && "job" in options.include) {
    const jobs = await listJobs();
    base.job = jobs.find((job) => job.id === slot.jobId) ?? null;
  }

  if (options?.include && "booking" in options.include) {
    const bookings = await listInterviewBookings();
    const booking = bookings.find((item) => item.slotId === slot.id) ?? null;

    if (booking && isPlainObject(options.include.booking) && isPlainObject(options.include.booking.include) && options.include.booking.include.candidate) {
      const candidates = await listCandidates();
      base.booking = {
        ...booking,
        candidate: candidates.find((candidate) => candidate.id === booking.candidateId) ?? null
      };
    } else {
      base.booking = booking;
    }
  }

  return options?.select ? project(base, options.select) : base;
}

async function enrichOutreachTemplate(template: OutreachTemplate, options?: { include?: Record<string, unknown>; select?: Record<string, unknown> }) {
  const base: Record<string, unknown> = { ...template };

  if (options?.include && "candidate" in options.include) {
    const candidates = await listCandidates();
    base.candidate = candidates.find((candidate) => candidate.id === template.candidateId) ?? null;
  }

  return options?.select ? project(base, options.select) : base;
}

// The adapter intentionally exposes a permissive Prisma-like surface while Mongo compatibility settles.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = {
  organization: {
    async count({ where }: { where?: Where }) {
      return countDocs((await listOrganizations()) as Array<Record<string, unknown>>, where);
    },
    async findFirst({ where }: { where?: Where }) {
      const organizations = await listOrganizations();
      return organizations.find((item) => matchesWhere(item as Record<string, unknown>, where));
    },
    async findMany({ where, orderBy, select }: { where?: Where; orderBy?: OrderBy; select?: Record<string, unknown> }) {
      const organizations = sortDocs((await listOrganizations()).filter((item) => matchesWhere(item as Record<string, unknown>, where)), orderBy);
      return select ? organizations.map((organization) => project(organization as Record<string, unknown>, select)) : organizations;
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      const organizations = await listOrganizations();
      const current = organizations.find((organization) => organization.id === where.id);
      if (!current) {
        throw new Error('Organization not found');
      }

      const updated: Organization = {
        ...current,
        ...data,
        updatedAt: now()
      } as Organization;
      await replaceOne(collectionNames.organizations, updated);
      return updated;
    },
    async create({ data, include }: { data: Record<string, unknown>; include?: Record<string, unknown> }) {
      const organizationId = typeof data.id === "string" ? data.id : randomUUID();
      const organization: Organization = {
        id: organizationId,
        name: String(data.name),
        slug: String(data.slug),
        status: (data.status as Organization['status'] | undefined) ?? 'ACTIVE',
        requestedByEmail: (data.requestedByEmail as string | undefined) ?? null,
        approvedAt: (data.approvedAt as Date | undefined) ?? null,
        approvedById: (data.approvedById as string | undefined) ?? null,
        approvalNotes: (data.approvalNotes as string | undefined) ?? null,
        deactivatedAt: (data.deactivatedAt as Date | undefined) ?? null,
        contractEndsAt: (data.contractEndsAt as Date | undefined) ?? null,
        deletedAt: (data.deletedAt as Date | undefined) ?? null,
        createdAt: now(),
        updatedAt: now()
      };
      await insertOne(collectionNames.organizations, organization);

      let users: User[] = [];
      if (isPlainObject(data.users) && data.users.create) {
        const userCreates = Array.isArray(data.users.create) ? data.users.create : [data.users.create];
        users = userCreates
          .filter(isPlainObject)
          .map((userCreate) => ({
            id: randomUUID(),
            organizationId,
            supabaseAuthId: (userCreate.supabaseAuthId as string | undefined) ?? null,
            username: (userCreate.username as string | undefined) ?? null,
            email: String(userCreate.email),
            pendingEmail: null,
            passwordHash: String(userCreate.passwordHash),
            fullName: String(userCreate.fullName),
            avatarUrl: null,
            avatarStorageKey: null,
            phone: null,
            company: null,
            position: null,
            location: null,
            address: null,
            skills: [],
            experienceSummary: null,
            educationSummary: null,
            bio: null,
            role: String(userCreate.role) as User["role"],
            accountStatus: "ACTIVE",
            deactivatedAt: null,
            scheduledDeletionAt: null,
            onboardingCompleted: Boolean(userCreate.onboardingCompleted ?? false),
            deletedAt: null,
            createdAt: now(),
            updatedAt: now()
          }));

        for (const user of users) {
          await insertOne(collectionNames.users, user);
        }
      }

      return include?.users ? { ...organization, users } : organization;
    }
  },
  user: {
    async findFirst({ where, orderBy, select }: { where?: Where; orderBy?: OrderBy; select?: Record<string, unknown> }) {
      const users = takeDocs(sortDocs((await listUsers()).filter((item) => matchesWhere(item as Record<string, unknown>, where)), orderBy), 1);
      const found = users[0];
      return found ? (select ? project(found as Record<string, unknown>, select) : found) : null;
    },
    async findMany({ where, orderBy, select }: { where?: Where; orderBy?: OrderBy; select?: Record<string, unknown> }) {
      const users = sortDocs((await listUsers()).filter((item) => matchesWhere(item as Record<string, unknown>, where)), orderBy);
      return select ? users.map((user) => project(user as Record<string, unknown>, select)) : users;
    },
    async create({ data }: { data: Record<string, unknown> }) {
      const user: User = {
        id: typeof data.id === "string" ? data.id : randomUUID(),
        organizationId: String(data.organizationId),
        supabaseAuthId: (data.supabaseAuthId as string | undefined) ?? null,
        username: (data.username as string | undefined) ?? null,
        email: String(data.email).toLowerCase(),
        pendingEmail: (data.pendingEmail as string | undefined) ?? null,
        passwordHash: String(data.passwordHash ?? ""),
        fullName: String(data.fullName),
        avatarUrl: (data.avatarUrl as string | undefined) ?? null,
        avatarStorageKey: (data.avatarStorageKey as string | undefined) ?? null,
        phone: (data.phone as string | undefined) ?? null,
        company: (data.company as string | undefined) ?? null,
        position: (data.position as string | undefined) ?? null,
        location: (data.location as string | undefined) ?? null,
        address: (data.address as string | undefined) ?? null,
        skills: (data.skills as string[] | undefined) ?? [],
        experienceSummary: (data.experienceSummary as string | undefined) ?? null,
        educationSummary: (data.educationSummary as string | undefined) ?? null,
        bio: (data.bio as string | undefined) ?? null,
        role: String(data.role) as User["role"],
        accountStatus: (data.accountStatus as User["accountStatus"] | undefined) ?? "ACTIVE",
        deactivatedAt: (data.deactivatedAt as Date | undefined) ?? null,
        scheduledDeletionAt: (data.scheduledDeletionAt as Date | undefined) ?? null,
        onboardingCompleted: Boolean(data.onboardingCompleted ?? false),
        deletedAt: null,
        createdAt: now(),
        updatedAt: now()
      };

      await insertOne(collectionNames.users, user);
      return user;
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      const users = await listUsers();
      const current = users.find((user) => user.id === where.id);
      if (!current) {
        throw new Error("User not found");
      }

      const updated: User = {
        ...current,
        ...data,
        updatedAt: now()
      } as User;
      await replaceOne(collectionNames.users, updated);
      return updated;
    }
  },
  job: {
    async count({ where }: { where?: Where }) {
      return countDocs((await listJobs()) as Array<Record<string, unknown>>, where);
    },
    async findMany({ where, orderBy, include, select, take }: { where?: Where; orderBy?: OrderBy; include?: Record<string, unknown>; select?: Record<string, unknown>; take?: number }) {
      const jobs = takeDocs(sortDocs((await listJobs()).filter((item) => matchesWhere(item as Record<string, unknown>, where)), orderBy), take);
      return Promise.all(jobs.map((job) => enrichJob(job, { include, select })));
    },
    async findFirst({ where, include, select }: { where?: Where; include?: Record<string, unknown>; select?: Record<string, unknown> }) {
      const job = (await listJobs()).find((item) => matchesWhere(item as Record<string, unknown>, where));
      return job ? enrichJob(job, { include, select }) : null;
    },
    async create({ data, include }: { data: Record<string, unknown>; include?: Record<string, unknown> }) {
      const timestamp = now();
      const jobId = randomUUID();
      const generatedAds = Array.isArray((data.generatedAds as Record<string, unknown> | undefined)?.create)
        ? (((data.generatedAds as Record<string, unknown>).create as Array<Record<string, unknown>>).map((item) => ({
            id: randomUUID(),
            jobId,
            channel: String(item.channel),
            content: String(item.content),
            createdAt: timestamp,
            updatedAt: timestamp
          })))
        : [];

      const job: Job = {
        id: jobId,
        organizationId: String(data.organizationId),
        createdById: String(data.createdById),
        assignedRecruiterId: (data.assignedRecruiterId as string | undefined) ?? null,
        assignmentHistory: (data.assignmentHistory as Job['assignmentHistory'] | undefined) ?? [],
        title: String(data.title),
        rawDescription: String(data.rawDescription),
        structuredData: (data.structuredData as Record<string, unknown> | undefined) ?? null,
        status: String(data.status) as Job["status"],
        headcount: Number(data.headcount ?? 1),
        location: (data.location as string | undefined) ?? null,
        sourceCampaign: (data.sourceCampaign as string | undefined) ?? null,
        candidateIds: [],
        generatedAds,
        mustHaveRequirements: (data.mustHaveRequirements as string[] | undefined) ?? [],
        niceToHaveRequirements: (data.niceToHaveRequirements as string[] | undefined) ?? [],
        deletedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      await insertOne(collectionNames.jobs, job);
      return include?.generatedAds ? { ...job, generatedAds } : job;
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      const jobs = await listJobs();
      const current = jobs.find((job) => job.id === where.id);
      if (!current) {
        throw new Error('Job not found');
      }

      const updated: Job = {
        ...current,
        ...data,
        updatedAt: now()
      } as Job;
      await replaceOne(collectionNames.jobs, updated);
      return updated;
    },
    async updateMany({ where, data }: { where?: Where; data: Record<string, unknown> }) {
      const jobs = await listJobs();
      const matched = jobs.filter((item) => matchesWhere(item as Record<string, unknown>, where));
      for (const job of matched) {
        await replaceOne(collectionNames.jobs, { ...job, ...data, updatedAt: now() } as Job);
      }
      return { count: matched.length };
    },
    async deleteMany({ where }: { where?: Where }) {
      const jobs = await listJobs();
      const matched = jobs.filter((item) => matchesWhere(item as Record<string, unknown>, where));
      for (const job of matched) {
        await replaceOne(collectionNames.jobs, { ...job, deletedAt: now(), updatedAt: now() });
      }
      return { count: matched.length };
    }
  },
  generatedJobAd: {
    async upsert({ where, update, create }: { where: { jobId_channel: { jobId: string; channel: string } }; update: Record<string, unknown>; create: Record<string, unknown> }) {
      const jobs = await listJobs();
      const job = jobs.find((item) => item.id === where.jobId_channel.jobId);
      if (!job) {
        throw new Error("Job not found for generated ad upsert");
      }

      const existing = job.generatedAds.find((item) => item.channel === where.jobId_channel.channel);
      const timestamp = now();
      const nextAd: GeneratedJobAdRecord = existing
        ? ({ ...existing, ...update, updatedAt: timestamp } as GeneratedJobAdRecord)
        : {
            id: randomUUID(),
            jobId: String(create.jobId),
            channel: String(create.channel),
            content: String(create.content),
            createdAt: timestamp,
            updatedAt: timestamp
          };

      const generatedAds = existing
        ? job.generatedAds.map((item) => (item.channel === nextAd.channel ? nextAd : item))
        : [...job.generatedAds, nextAd];

      await replaceOne(collectionNames.jobs, { ...job, generatedAds, updatedAt: timestamp });
      return nextAd;
    }
  },
  candidate: {
    async count({ where }: { where?: Where }) {
      return countDocs((await listCandidates()) as Array<Record<string, unknown>>, where);
    },
    async findMany({ where, orderBy, include, select, take }: { where?: Where; orderBy?: OrderBy; include?: Record<string, unknown>; select?: Record<string, unknown>; take?: number }) {
      const candidates = takeDocs(sortDocs((await listCandidates()).filter((item) => matchesWhere(item as Record<string, unknown>, where)), orderBy), take);
      return Promise.all(candidates.map((candidate) => enrichCandidate(candidate, { include, select })));
    },
    async findFirst({ where, orderBy, include, select }: { where?: Where; orderBy?: OrderBy; include?: Record<string, unknown>; select?: Record<string, unknown> }) {
      const candidates = takeDocs(sortDocs((await listCandidates()).filter((item) => matchesWhere(item as Record<string, unknown>, where)), orderBy), 1);
      const candidate = candidates[0];
      return candidate ? enrichCandidate(candidate, { include, select }) : null;
    },
    async findUnique({ where, include }: { where: { id: string }; include?: Record<string, unknown> }) {
      const candidate = (await listCandidates()).find((item) => item.id === where.id) ?? null;
      if (!candidate) {
        return null;
      }

      let files = candidate.files ?? [];
      if (include?.files && isPlainObject(include.files)) {
        const fileWhere = include.files.where as Record<string, unknown> | undefined;
        files = files.filter((file) => matchesWhere(file as Record<string, unknown>, fileWhere));
        files = sortDocs(files as unknown as Array<Record<string, unknown>>, include.files.orderBy as OrderBy) as unknown as CandidateFileRecord[];
        files = takeDocs(files, include.files.take as number | undefined);
      }

      return enrichCandidate({ ...candidate, files }, { include });
    },
    async create({ data }: { data: Record<string, unknown> }) {
      const timestamp = now();
      const candidateId = randomUUID();
      const stageEventCreate = isPlainObject(data.stageEvents) && isPlainObject(data.stageEvents.create) ? data.stageEvents.create : null;
      const candidate: Candidate = {
        id: candidateId,
        organizationId: String(data.organizationId),
        jobId: String(data.jobId),
        firstName: String(data.firstName),
        lastName: String(data.lastName),
        email: String(data.email),
        phone: (data.phone as string | undefined) ?? null,
        country: (data.country as string | undefined) ?? null,
        address: (data.address as string | undefined) ?? null,
        linkedInUrl: (data.linkedInUrl as string | undefined) ?? null,
        source: String(data.source),
        stage: String(data.stage ?? "APPLIED") as Candidate["stage"],
        yearsExperience: (data.yearsExperience as number | undefined) ?? null,
        notes: (data.notes as string | undefined) ?? null,
        skills: (data.skills as string[] | undefined) ?? [],
        experienceSummary: (data.experienceSummary as string | undefined) ?? null,
        educationSummary: (data.educationSummary as string | undefined) ?? null,
        resumeText: (data.resumeText as string | undefined) ?? null,
        parsedProfile: (data.parsedProfile as Record<string, unknown> | undefined) ?? null,
        cvEvaluation: null,
        voiceEvaluation: null,
        cvScore: null,
        englishScore: null,
        overallScore: null,
        rankingScore: 0,
        suggestedStage: null,
        files: [],
        interviewScorecards: [],
        scheduledPurgeAt: null,
        purgedAt: null,
        stageEvents: stageEventCreate
          ? [{
              id: randomUUID(),
              candidateId,
              fromStage: null,
              toStage: String(stageEventCreate.toStage) as CandidateStageEventRecord["toStage"],
              reason: (stageEventCreate.reason as string | undefined) ?? null,
              createdAt: timestamp
            }]
          : [],
        deletedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      await insertOne(collectionNames.candidates, candidate);

      const jobs = await listJobs();
      const job = jobs.find((item) => item.id === candidate.jobId);
      if (job) {
        const candidateIds = Array.from(new Set([...(job.candidateIds ?? []), candidate.id]));
        await replaceOne(collectionNames.jobs, { ...job, candidateIds, updatedAt: timestamp });
      }

      return candidate;
    },
    async update({ where, data, include }: { where: { id: string }; data: Record<string, unknown>; include?: Record<string, unknown> }) {
      const candidates = await listCandidates();
      const current = candidates.find((item) => item.id === where.id);
      if (!current) {
        throw new Error("Candidate not found");
      }

      let stageEvents = current.stageEvents ?? [];
      if (isPlainObject(data.stageEvents) && isPlainObject(data.stageEvents.create)) {
        const stageEventCreate = data.stageEvents.create;
        stageEvents = [
          ...stageEvents,
          {
            id: randomUUID(),
            candidateId: current.id,
            fromStage: (stageEventCreate.fromStage as CandidateStageEventRecord["fromStage"]) ?? null,
            toStage: String(stageEventCreate.toStage) as CandidateStageEventRecord["toStage"],
            reason: (stageEventCreate.reason as string | undefined) ?? null,
            createdAt: now()
          }
        ];
      }

      const updated: Candidate = {
        ...current,
        ...data,
        files: data.files !== undefined ? (data.files as CandidateFileRecord[]) : current.files,
        stageEvents,
        updatedAt: now()
      } as Candidate;
      await replaceOne(collectionNames.candidates, updated);
      return include ? enrichCandidate(updated, { include }) : updated;
    }
  },
  candidateFile: {
    async findFirst({ where }: { where?: Where & { candidate?: Record<string, unknown> } }) {
      const candidates = await listCandidates();
      for (const candidate of candidates) {
        if (where?.candidate && !matchesWhere(candidate as Record<string, unknown>, where.candidate)) {
          continue;
        }

        const fileWhere = { ...where, candidate: undefined, candidateId: candidate.id } as Record<string, unknown>;
        const file = candidate.files.find((item) => matchesWhere(item as Record<string, unknown>, fileWhere));
        if (file) {
          return file;
        }
      }

      return null;
    },
    async create({ data }: { data: Record<string, unknown> }) {
      const candidates = await listCandidates();
      const candidate = candidates.find((item) => item.id === data.candidateId);
      if (!candidate) {
        throw new Error("Candidate not found for file create");
      }

      const file: CandidateFileRecord = {
        id: randomUUID(),
        candidateId: candidate.id,
        kind: String(data.kind) as CandidateFileRecord["kind"],
        fileName: String(data.fileName),
        mimeType: String(data.mimeType),
        storageKey: String(data.storageKey),
        sizeBytes: Number(data.sizeBytes),
        createdAt: now()
      };

      await replaceOne(collectionNames.candidates, { ...candidate, files: [...candidate.files, file], updatedAt: now() });
      return file;
    }
  },
  interviewSlot: {
    async findMany({ where, orderBy, include, take }: { where?: Where; orderBy?: OrderBy; include?: Record<string, unknown>; take?: number }) {
      const slots = takeDocs(sortDocs((await listInterviewSlots()).filter((item) => matchesWhere(item as Record<string, unknown>, where)), orderBy), take);
      return Promise.all(slots.map((slot) => enrichInterviewSlot(slot, { include })));
    },
    async findFirst({ where, include }: { where?: Where; include?: Record<string, unknown> }) {
      const slot = (await listInterviewSlots()).find((item) => matchesWhere(item as Record<string, unknown>, where));
      return slot ? enrichInterviewSlot(slot, { include }) : null;
    },
    async create({ data }: { data: Record<string, unknown> }) {
      const timestamp = now();
      const slot: InterviewSlot = {
        id: randomUUID(),
        organizationId: String(data.organizationId),
        jobId: String(data.jobId),
        assignedRecruiterId: (data.assignedRecruiterId as string | undefined) ?? null,
        interviewerNames: (data.interviewerNames as string[] | undefined) ?? [],
        startsAt: new Date(String(data.startsAt)),
        endsAt: new Date(String(data.endsAt)),
        status: (data.status as InterviewSlot["status"]) ?? "AVAILABLE",
        location: (data.location as string | undefined) ?? null,
        notes: (data.notes as string | undefined) ?? null,
        reminderSentAt: null,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      await insertOne(collectionNames.interviewSlots, slot);
      return slot;
    },
    async update({ where, data, include }: { where: { id: string }; data: Record<string, unknown>; include?: Record<string, unknown> }) {
      const slots = await listInterviewSlots();
      const current = slots.find((item) => item.id === where.id);
      if (!current) {
        throw new Error("Interview slot not found");
      }

      const updated: InterviewSlot = {
        ...current,
        ...data,
        startsAt: data.startsAt ? new Date(String(data.startsAt)) : current.startsAt,
        endsAt: data.endsAt ? new Date(String(data.endsAt)) : current.endsAt,
        notes: data.notes !== undefined ? (data.notes as string | null) : current.notes,
        updatedAt: now()
      } as InterviewSlot;
      await replaceOne(collectionNames.interviewSlots, updated);
      return include ? enrichInterviewSlot(updated, { include }) : updated;
    }
  },
  interviewBooking: {
    async create({ data }: { data: Record<string, unknown> }) {
      const booking: InterviewBooking = {
        id: randomUUID(),
        slotId: String(data.slotId),
        candidateId: String(data.candidateId),
        status: String(data.status ?? "SCHEDULED") as InterviewBooking["status"],
        notes: (data.notes as string | undefined) ?? null,
        interviewEvaluation: (data.interviewEvaluation as InterviewBooking["interviewEvaluation"] | undefined) ?? null,
        createdAt: now(),
        updatedAt: now()
      };
      await insertOne(collectionNames.interviewBookings, booking);
      return booking;
    },
    async update({ where, data }: { where: { slotId: string }; data: Record<string, unknown> }) {
      const bookings = await listInterviewBookings();
      const current = bookings.find((item) => item.slotId === where.slotId);
      if (!current) {
        throw new Error("Interview booking not found");
      }

      const updated: InterviewBooking = {
        ...current,
        ...data,
        updatedAt: now()
      } as InterviewBooking;
      await replaceOne(collectionNames.interviewBookings, updated);
      return updated;
    }
  },
  notification: {
    async findMany({ where, orderBy, take }: { where?: Where; orderBy?: OrderBy; take?: number }) {
      return takeDocs(sortDocs((await listNotifications()).filter((item) => matchesWhere(item as Record<string, unknown>, where)), orderBy), take);
    },
    async create({ data }: { data: Notification }) {
      return insertOne(collectionNames.notifications, data);
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      const jobs = await listJobs();
      const current = jobs.find((job) => job.id === where.id);
      if (!current) {
        throw new Error('Job not found');
      }

      const updated: Job = {
        ...current,
        ...data,
        updatedAt: now()
      } as Job;
      await replaceOne(collectionNames.jobs, updated);
      return updated;
    },
    async updateMany({ where, data }: { where?: Where; data: Record<string, unknown> }) {
      const notifications = await listNotifications();
      const matched = notifications.filter((item) => matchesWhere(item as Record<string, unknown>, where));
      for (const notification of matched) {
        await replaceOne(collectionNames.notifications, { ...notification, ...data } as Notification);
      }
      return { count: matched.length };
    }
  },
  supportThread: {
    async findMany({ where, orderBy, take }: { where?: Where; orderBy?: OrderBy; take?: number }) {
      return takeDocs(sortDocs((await listSupportThreads()).filter((item) => matchesWhere(item as Record<string, unknown>, where)), orderBy), take);
    },
    async findFirst({ where, orderBy }: { where?: Where; orderBy?: OrderBy }) {
      const threads = takeDocs(sortDocs((await listSupportThreads()).filter((item) => matchesWhere(item as Record<string, unknown>, where)), orderBy), 1);
      return threads[0] ?? null;
    },
    async create({ data }: { data: SupportThread }) {
      return insertOne(collectionNames.supportThreads, data);
    },
    async update({ where, data }: { where: { id: string }; data: Partial<SupportThread> }) {
      const threads = await listSupportThreads();
      const current = threads.find((thread) => thread.id === where.id);
      if (!current) {
        throw new Error("Support thread not found");
      }

      const updated: SupportThread = {
        ...current,
        ...data,
        updatedAt: now()
      } as SupportThread;
      await replaceOne(collectionNames.supportThreads, updated);
      return updated;
    }
  },
  outreachTemplate: {
    async findMany({ where, orderBy, take, include }: { where?: Where; orderBy?: OrderBy; take?: number; include?: Record<string, unknown> }) {
      const templates = takeDocs(sortDocs((await listOutreachTemplates()).filter((item) => matchesWhere(item as Record<string, unknown>, where)), orderBy), take);
      return Promise.all(templates.map((template) => enrichOutreachTemplate(template, { include })));
    },
    async create({ data }: { data: Record<string, unknown> }) {
      const template: OutreachTemplate = {
        id: randomUUID(),
        organizationId: String(data.organizationId),
        jobId: (data.jobId as string | undefined) ?? null,
        candidateId: (data.candidateId as string | undefined) ?? null,
        kind: String(data.kind) as OutreachTemplate["kind"],
        channel: String(data.channel ?? "whatsapp"),
        content: String(data.content),
        createdAt: now(),
        updatedAt: now()
      };
      await insertOne(collectionNames.outreachTemplates, template);
      return template;
    }
  },
  auditLog: {
    async findMany({ where, orderBy, take }: { where?: Where; orderBy?: OrderBy; take?: number }) {
      const logs = (await fetchAll<AuditLog>(collectionNames.auditLogs)).map(stripMongoId);
      return takeDocs(sortDocs(logs.filter((item) => matchesWhere(item as Record<string, unknown>, where)), orderBy), take);
    },
    async create({ data }: { data: AuditLog | Record<string, unknown> }) {
      const log: AuditLog = {
        id: typeof data.id === "string" ? data.id : randomUUID(),
        organizationId: String(data.organizationId),
        userId: (data.userId as string | undefined) ?? null,
        action: String(data.action),
        entityType: String(data.entityType),
        entityId: String(data.entityId),
        meta: (data.meta as Record<string, unknown> | undefined) ?? null,
        createdAt: data.createdAt instanceof Date ? data.createdAt : now()
      };
      return insertOne(collectionNames.auditLogs, log);
    }
  },
  queueJob: {
    async findMany({ where, orderBy, take }: { where?: Where; orderBy?: OrderBy; take?: number }) {
      const jobs = (await fetchAll<QueueJob>(collectionNames.queueJobs)).map(stripMongoId);
      return takeDocs(sortDocs(jobs.filter((item) => matchesWhere(item as Record<string, unknown>, where)), orderBy), take);
    },
    async create({ data }: { data: QueueJob }) {
      return insertOne(collectionNames.queueJobs, data);
    },
    async update({ where, data }: { where: { id: string }; data: Partial<QueueJob> }) {
      const jobs = (await fetchAll<QueueJob>(collectionNames.queueJobs)).map(stripMongoId);
      const current = jobs.find((item) => item.id === where.id);
      if (!current) {
        throw new Error("Queue job not found");
      }
      const updated = { ...current, ...data, updatedAt: now() } as QueueJob;
      await replaceOne(collectionNames.queueJobs, updated);
      return updated;
    }
  }
};






























