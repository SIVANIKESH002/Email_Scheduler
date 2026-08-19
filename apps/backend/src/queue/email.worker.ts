import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { EMAIL_QUEUE_NAME, EmailJobPayload, emailQueue } from './email.queue';
import { rateLimiterService } from '../services/rate-limiter.service';
import { etherealService } from '../services/ethereal.service';
import { config } from '../config/env';

const prisma = new PrismaClient();

export function createEmailWorker() {
  const worker = new Worker<EmailJobPayload>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobPayload>) => {
      const { scheduledEmailId, senderId, senderName, senderEmail, recipientEmail, subject, body } =
        job.data;

      console.log(`[Worker Job ${job.id}] Processing email for ${recipientEmail}`);

      // 1. Idempotency & DB State Check
      const scheduledEmail = await prisma.scheduledEmail.findUnique({
        where: { id: scheduledEmailId },
      });

      if (!scheduledEmail) {
        console.warn(`[Worker Job ${job.id}] Email record ${scheduledEmailId} not found in DB. Skipping.`);
        return;
      }

      if (scheduledEmail.status === 'SENT') {
        console.log(`[Worker Job ${job.id}] Email ${scheduledEmailId} already SENT. Skipping.`);
        return;
      }

      // Mark status as PROCESSING
      await prisma.scheduledEmail.update({
        where: { id: scheduledEmailId },
        data: { status: 'PROCESSING' },
      });

      // 2. Hourly Rate Limiter Check
      const rateLimitResult = await rateLimiterService.checkAndIncrement(senderId);
      if (!rateLimitResult.allowed) {
        const delay = rateLimitResult.delayMs || 3600000;
        console.warn(
          `[Worker Job ${job.id}] Rate limit exceeded (${rateLimitResult.reason}). Re-queueing job in ${Math.round(
            delay / 1000
          )}s.`
        );

        // Re-queue job to next window
        await emailQueue.add('send-scheduled-email', job.data, {
          delay,
          jobId: `${job.data.idempotencyKey}-retry-${Date.now()}`,
        });

        // Revert status back to PENDING
        await prisma.scheduledEmail.update({
          where: { id: scheduledEmailId },
          data: { status: 'PENDING' },
        });

        return;
      }

      // 3. Send Email via Ethereal SMTP
      try {
        const fromAddress = `"${senderName}" <${senderEmail}>`;
        const result = await etherealService.sendMail({
          from: fromAddress,
          to: recipientEmail,
          subject,
          html: body,
        });

        // Update DB to SENT
        await prisma.scheduledEmail.update({
          where: { id: scheduledEmailId },
          data: { status: 'SENT' },
        });

        // Create SendLog
        await prisma.sendLog.create({
          data: {
            scheduledEmailId,
            status: 'SENT',
            previewUrl: result.previewUrl || null,
          },
        });

        console.log(`✅ [Worker Job ${job.id}] Successfully sent email to ${recipientEmail}`);
        if (result.previewUrl) {
          console.log(`   🔗 Ethereal Preview: ${result.previewUrl}`);
        }
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error while sending email';
        console.error(`❌ [Worker Job ${job.id}] Failed to send email to ${recipientEmail}:`, errorMessage);

        // Update DB to FAILED
        await prisma.scheduledEmail.update({
          where: { id: scheduledEmailId },
          data: { status: 'FAILED' },
        });

        // Create SendLog
        await prisma.sendLog.create({
          data: {
            scheduledEmailId,
            status: 'FAILED',
            error: errorMessage,
          },
        });

        throw error;
      } finally {
        // Enforce configured minimum delay between sends per worker slot
        if (config.minDelayBetweenSendsMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, config.minDelayBetweenSendsMs));
        }
      }
    },
    {
      connection: {
        host: config.redisHost,
        port: config.redisPort,
      },
      concurrency: config.workerConcurrency,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[Worker Event] Job ${job?.id} failed:`, err);
  });

  return worker;
}
