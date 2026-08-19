import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'mysql://reachinbox_user:reachinbox_pass@localhost:3306/reachinbox_db',
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  minDelayBetweenSendsMs: parseInt(process.env.MIN_DELAY_MS_BETWEEN_SENDS || '2000', 10),
  maxEmailsPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR || '1000', 10),
  maxEmailsPerHourPerSender: parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '200', 10),
  devMode: process.env.DEV_MODE === 'true'
};
