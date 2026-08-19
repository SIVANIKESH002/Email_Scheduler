import { PrismaClient } from '@prisma/client';
import { emailQueue, addEmailJobToQueue } from '../queue/email.queue';

const prisma = new PrismaClient();

export async function runServerRecoveryAudit(): Promise<{ auditCount: number; recoveredCount: number }> {
  console.log('🔍 Starting Server Recovery Audit for PENDING emails...');

  const pendingEmails = await prisma.scheduledEmail.findMany({
    where: { status: 'PENDING' },
    include: { sender: true },
  });

  let recoveredCount = 0;

  for (const email of pendingEmails) {
    try {
      // Check if job exists in BullMQ
      const existingJob = await emailQueue.getJob(email.idempotencyKey);
      const isJobActiveOrDelayed = existingJob && (await existingJob.isDelayed() || await existingJob.isActive() || await existingJob.isWaiting());

      if (!isJobActiveOrDelayed) {
        const delayMs = Math.max(0, new Date(email.scheduledAt).getTime() - Date.now());

        const job = await addEmailJobToQueue(
          {
            scheduledEmailId: email.id,
            senderId: email.senderId,
            senderName: email.sender.name,
            senderEmail: email.sender.email,
            recipientEmail: email.recipientEmail,
            subject: email.subject,
            body: email.body,
            scheduledAt: email.scheduledAt.toISOString(),
            idempotencyKey: email.idempotencyKey,
          },
          delayMs
        );

        await prisma.scheduledEmail.update({
          where: { id: email.id },
          data: { bullmqJobId: job.id },
        });

        recoveredCount++;
        console.log(`   ♻️ Recovered PENDING email ${email.id} (Job ID: ${job.id}, Delay: ${Math.round(delayMs / 1000)}s)`);
      }
    } catch (err) {
      console.error(`   ❌ Failed to audit email ${email.id}:`, err);
    }
  }

  console.log(`✅ Recovery Audit complete: Audited ${pendingEmails.length} pending emails, recovered ${recoveredCount} jobs.`);
  return { auditCount: pendingEmails.length, recoveredCount };
}
