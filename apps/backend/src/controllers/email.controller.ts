import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { generateIdempotencyKey, addEmailJobToQueue } from '../queue/email.queue';

const prisma = new PrismaClient();

const scheduleEmailSchema = z.object({
  recipients: z.array(z.string().email()).min(1, 'At least one recipient is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required'),
  scheduledAt: z.string().datetime().or(z.string()),
  senderIds: z.array(z.string()).optional(),
  senderId: z.string().optional(),
  multiSenderMode: z.enum(['round-robin', 'single-sender']).default('round-robin'),
  delayBetweenEmailsMs: z.number().nonnegative().default(0),
});

export async function scheduleEmailsHandler(req: Request, res: Response) {
  try {
    const body = scheduleEmailSchema.parse(req.body);

    // 1. Resolve Senders
    let senders: Array<{ id: string; name: string; email: string }> = [];

    if (body.senderIds && body.senderIds.length > 0) {
      senders = await prisma.sender.findMany({
        where: { id: { in: body.senderIds } },
      });
    } else if (body.senderId) {
      const s = await prisma.sender.findUnique({ where: { id: body.senderId } });
      if (s) senders.push(s);
    }

    // If no valid senders specified, pick or create default sender identity
    if (senders.length === 0) {
      let defaultSender = await prisma.sender.findFirst();
      if (!defaultSender) {
        defaultSender = await prisma.sender.create({
          data: {
            name: 'ReachInbox Sales Team',
            email: 'outreach@reachinbox-demo.com',
            smtpIdentity: 'ethereal-default',
          },
        });
      }
      senders.push(defaultSender);
    }

    const baseScheduledDate = new Date(body.scheduledAt);
    const results: any[] = [];
    const sourceBatchId = `batch-${Date.now()}`;

    // 2. Iterate through recipients and schedule
    for (let i = 0; i < body.recipients.length; i++) {
      const recipientEmail = body.recipients[i];

      // Assign sender based on multiSenderMode
      const selectedSender =
        body.multiSenderMode === 'round-robin'
          ? senders[i % senders.length]
          : senders[0];

      // Calculate staggered schedule time for batch item
      const itemScheduledAt = new Date(
        baseScheduledDate.getTime() + i * body.delayBetweenEmailsMs
      );

      // Generate SHA-256 Idempotency Key
      const idempotencyKey = generateIdempotencyKey(
        selectedSender.id,
        recipientEmail,
        body.subject,
        itemScheduledAt
      );

      // Check DB for existing record with this idempotency key
      let scheduledEmail = await prisma.scheduledEmail.findUnique({
        where: { idempotencyKey },
      });

      if (!scheduledEmail) {
        scheduledEmail = await prisma.scheduledEmail.create({
          data: {
            senderId: selectedSender.id,
            recipientEmail,
            subject: body.subject,
            body: body.body,
            scheduledAt: itemScheduledAt,
            status: 'PENDING',
            idempotencyKey,
          },
        });

        // Enqueue delayed job in BullMQ
        const delayMs = Math.max(0, itemScheduledAt.getTime() - Date.now());
        const job = await addEmailJobToQueue(
          {
            scheduledEmailId: scheduledEmail.id,
            senderId: selectedSender.id,
            senderName: selectedSender.name,
            senderEmail: selectedSender.email,
            recipientEmail,
            subject: body.subject,
            body: body.body,
            scheduledAt: itemScheduledAt.toISOString(),
            idempotencyKey,
          },
          delayMs
        );

        // Update record with bullmqJobId
        scheduledEmail = await prisma.scheduledEmail.update({
          where: { id: scheduledEmail.id },
          data: { bullmqJobId: job.id },
        });

        // Also track Lead
        await prisma.lead.create({
          data: {
            email: recipientEmail,
            sourceBatchId,
          },
        });
      }

      results.push(scheduledEmail);
    }

    return res.status(201).json({
      success: true,
      message: `Successfully scheduled ${results.length} email(s)`,
      batchId: sourceBatchId,
      scheduledCount: results.length,
      data: results,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation Error', details: error.errors });
    }
    console.error('Error in scheduleEmailsHandler:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}

export async function getScheduledEmailsHandler(req: Request, res: Response) {
  try {
    const scheduled = await prisma.scheduledEmail.findMany({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      include: {
        sender: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return res.json({ success: true, data: scheduled });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getSentEmailsHandler(req: Request, res: Response) {
  try {
    const sent = await prisma.scheduledEmail.findMany({
      where: {
        status: { in: ['SENT', 'FAILED'] },
      },
      include: {
        sender: true,
        sendLogs: {
          orderBy: { attemptedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json({ success: true, data: sent });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getStatsHandler(req: Request, res: Response) {
  try {
    const [pendingCount, processingCount, sentCount, failedCount, totalSenders] = await Promise.all([
      prisma.scheduledEmail.count({ where: { status: 'PENDING' } }),
      prisma.scheduledEmail.count({ where: { status: 'PROCESSING' } }),
      prisma.scheduledEmail.count({ where: { status: 'SENT' } }),
      prisma.scheduledEmail.count({ where: { status: 'FAILED' } }),
      prisma.sender.count(),
    ]);

    return res.json({
      success: true,
      data: {
        pending: pendingCount,
        processing: processingCount,
        sent: sentCount,
        failed: failedCount,
        totalScheduled: pendingCount + processingCount + sentCount + failedCount,
        sendersCount: totalSenders,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getSendersHandler(req: Request, res: Response) {
  try {
    let senders = await prisma.sender.findMany();
    
    // Seed default senders if none exist
    if (senders.length === 0) {
      await prisma.sender.createMany({
        data: [
          { name: 'Alex Rivers (Growth Lead)', email: 'alex.rivers@reachinbox-demo.com', smtpIdentity: 'ethereal-1' },
          { name: 'Sarah Chen (Sales Ops)', email: 'sarah.chen@reachinbox-demo.com', smtpIdentity: 'ethereal-2' },
          { name: 'David Miller (Outreach)', email: 'david.miller@reachinbox-demo.com', smtpIdentity: 'ethereal-3' },
        ],
      });
      senders = await prisma.sender.findMany();
    }

    return res.json({ success: true, data: senders });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function createSenderHandler(req: Request, res: Response) {
  try {
    const createSenderSchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
    });

    const body = createSenderSchema.parse(req.body);
    const sender = await prisma.sender.create({
      data: {
        name: body.name,
        email: body.email,
        smtpIdentity: 'ethereal-custom',
      },
    });

    return res.status(201).json({ success: true, data: sender });
  } catch (error: any) {
    return res.status(400).json({ success: false, error: error.message });
  }
}
