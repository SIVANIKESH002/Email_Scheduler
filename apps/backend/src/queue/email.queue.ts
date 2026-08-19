import { Queue } from 'bullmq';
import crypto from 'crypto';
import { config } from '../config/env';

export interface EmailJobPayload {
  scheduledEmailId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string; // ISO date string
  idempotencyKey: string;
}

export const EMAIL_QUEUE_NAME = 'email-queue';

export const emailQueue = new Queue<EmailJobPayload>(EMAIL_QUEUE_NAME, {
  connection: {
    host: config.redisHost,
    port: config.redisPort,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export function generateIdempotencyKey(
  senderId: string,
  recipientEmail: string,
  subject: string,
  scheduledAt: string | Date
): string {
  const dateStr = typeof scheduledAt === 'string' ? scheduledAt : scheduledAt.toISOString();
  const raw = `${senderId}:${recipientEmail.trim().toLowerCase()}:${subject.trim()}:${dateStr}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function addEmailJobToQueue(payload: EmailJobPayload, delayMs: number) {
  // Use idempotencyKey as the BullMQ jobId to guarantee strict deduplication
  const job = await emailQueue.add('send-scheduled-email', payload, {
    jobId: payload.idempotencyKey,
    delay: Math.max(0, delayMs),
  });

  return job;
}
