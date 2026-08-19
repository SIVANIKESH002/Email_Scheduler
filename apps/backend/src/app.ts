import express from 'express';
import cors from 'cors';
import {
  scheduleEmailsHandler,
  getScheduledEmailsHandler,
  getSentEmailsHandler,
  getStatsHandler,
  getSendersHandler,
  createSenderHandler,
} from './controllers/email.controller';

export function createApp() {
  const app = express();

  app.use(cors({ origin: '*' }));
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.post('/api/emails/schedule', scheduleEmailsHandler);
  app.get('/api/emails/scheduled', getScheduledEmailsHandler);
  app.get('/api/emails/sent', getSentEmailsHandler);
  app.get('/api/emails/stats', getStatsHandler);
  app.get('/api/senders', getSendersHandler);
  app.post('/api/senders', createSenderHandler);

  return app;
}
