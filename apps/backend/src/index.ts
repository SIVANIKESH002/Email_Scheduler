import { createApp } from './app';
import { config } from './config/env';
import { etherealService } from './services/ethereal.service';
import { runServerRecoveryAudit } from './services/recovery.service';
import { createEmailWorker } from './queue/email.worker';
import { rateLimiterService } from './services/rate-limiter.service';

async function bootstrap() {
  console.log('🚀 Bootstrapping ReachInbox Email Scheduler Backend...');
  console.log(`   Worker Concurrency: ${config.workerConcurrency}`);
  console.log(`   Min Send Delay: ${config.minDelayBetweenSendsMs}ms`);
  console.log(`   Dev Mode: ${config.devMode}`);

  // 1. Initialize Ethereal SMTP account
  await etherealService.init();

  // 2. Audit DB vs BullMQ and recover orphaned pending jobs
  await runServerRecoveryAudit();

  // 3. Start BullMQ Worker
  const worker = createEmailWorker();
  console.log('⚙️ BullMQ Worker initialized and listening for jobs.');

  // 4. Create and launch Express HTTP Server
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`🌐 Express API Server running at http://localhost:${config.port}`);
  });

  // Graceful Shutdown Handler
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);

    server.close(() => {
      console.log('   HTTP Server closed.');
    });

    await worker.close();
    console.log('   BullMQ Worker closed.');

    await rateLimiterService.close();
    console.log('   RateLimiter Redis connection closed.');

    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('💥 Fatal error during bootstrap:', err);
  process.exit(1);
});
