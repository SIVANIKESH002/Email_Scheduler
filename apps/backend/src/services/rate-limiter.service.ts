import Redis from 'ioredis';
import { config } from '../config/env';

export class RateLimiterService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: config.redisHost,
      port: config.redisPort,
      maxRetriesPerRequest: null,
    });
  }

  private getCurrentHourKey(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(
      now.getUTCDate()
    ).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;
  }

  private getMsUntilNextHour(): number {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
    return Math.max(1000, nextHour.getTime() - now.getTime());
  }

  async checkAndIncrement(
    senderId: string,
    globalLimit: number = config.maxEmailsPerHour,
    senderLimit: number = config.maxEmailsPerHourPerSender
  ): Promise<{ allowed: boolean; delayMs?: number; reason?: string }> {
    const hourKey = this.getCurrentHourKey();
    const globalKey = `rate_limit:global:${hourKey}`;
    const senderKey = `rate_limit:sender:${senderId}:${hourKey}`;

    // Redis Pipeline to increment atomically and set TTL if new key
    const pipeline = this.redis.pipeline();
    pipeline.incr(globalKey);
    pipeline.ttl(globalKey);
    pipeline.incr(senderKey);
    pipeline.ttl(senderKey);

    const results = await pipeline.exec();
    if (!results) {
      throw new Error('Redis pipeline execution failed');
    }

    const globalCount = results[0][1] as number;
    const globalTtl = results[1][1] as number;
    const senderCount = results[2][1] as number;
    const senderTtl = results[3][1] as number;

    // Set expiration of 3600s if TTL is not set (-1)
    if (globalTtl === -1) {
      await this.redis.expire(globalKey, 3600);
    }
    if (senderTtl === -1) {
      await this.redis.expire(senderKey, 3600);
    }

    const msUntilNextHour = this.getMsUntilNextHour();

    if (globalCount > globalLimit) {
      return {
        allowed: false,
        delayMs: msUntilNextHour,
        reason: `Global hourly limit of ${globalLimit} exceeded`,
      };
    }

    if (senderCount > senderLimit) {
      return {
        allowed: false,
        delayMs: msUntilNextHour,
        reason: `Sender hourly limit of ${senderLimit} exceeded for sender ${senderId}`,
      };
    }

    return { allowed: true };
  }

  async close() {
    await this.redis.quit();
  }
}

export const rateLimiterService = new RateLimiterService();
