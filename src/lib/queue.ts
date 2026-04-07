import { randomUUID } from "crypto";

import { db } from "@/lib/db";
import type { QueueJob } from "@/lib/models";

type WorkerHandler = (jobs: Array<{ id: string; data: Record<string, unknown> }>) => Promise<void>;

class DatabaseQueue {
  private started = false;
  private intervals = new Map<string, NodeJS.Timeout>();

  async start() {
    this.started = true;
    return this;
  }

  async send(name: string, data: Record<string, unknown>, options?: { priority?: number; runAfter?: Date; maxAttempts?: number }) {
    const job: QueueJob = {
      id: randomUUID(),
      name,
      data,
      status: "queued",
      attempts: 0,
      maxAttempts: options?.maxAttempts ?? 3,
      priority: options?.priority ?? 0,
      lastError: null,
      runAfter: options?.runAfter ?? new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.queueJob.create({ data: job });
    return job.id;
  }

  async processNext(name: string, handler: WorkerHandler) {
    const [job] = await db.queueJob.findMany({
      where: {
        name,
        status: "queued",
        runAfter: { lt: new Date() }
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: 1
    });

    if (!job) {
      return false;
    }

    const attempts = (job.attempts ?? 0) + 1;
    await db.queueJob.update({
      where: { id: job.id },
      data: {
        status: "processing",
        attempts
      }
    });

    try {
      await handler([{ id: job.id, data: job.data }]);
      await db.queueJob.update({
        where: { id: job.id },
        data: { status: "completed", lastError: null }
      });
    } catch (error) {
      const failedPermanently = attempts >= (job.maxAttempts ?? 3);
      await db.queueJob.update({
        where: { id: job.id },
        data: {
          status: failedPermanently ? "failed" : "queued",
          lastError: error instanceof Error ? error.message : String(error),
          runAfter: new Date(Date.now() + 5000)
        }
      });

      console.error(`[queue:${name}] job ${job.id} failed`, error);
    }

    return true;
  }

  async drain(name: string, handler: WorkerHandler, limit = 5) {
    let processed = 0;

    while (processed < limit) {
      const didProcess = await this.processNext(name, handler);
      if (!didProcess) {
        break;
      }
      processed += 1;
    }

    return processed;
  }

  async work(name: string, handler: WorkerHandler) {
    if (this.intervals.has(name)) {
      return;
    }

    const tick = async () => {
      try {
        await this.processNext(name, handler);
      } catch (error) {
        console.error(`[queue:${name}] worker tick failed`, error);
      }
    };

    const interval = setInterval(() => {
      void tick();
    }, 1500);
    this.intervals.set(name, interval);
    await tick();
  }
}

declare global {
  var appQueue: DatabaseQueue | undefined;
}

export const queue = global.appQueue ?? new DatabaseQueue();
if (!global.appQueue) {
  global.appQueue = queue;
}

export async function ensureQueueStarted() {
  return queue.start();
}

export const queueNames = {
  cvAnalysis: "candidate.cv-analysis",
  voiceAnalysis: "candidate.voice-analysis",
  interviewReminder: "interview.reminder",
  userPurge: "user.purge",
  candidatePurge: "candidate.purge"
} as const;
