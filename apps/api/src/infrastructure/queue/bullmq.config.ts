import Redis from 'ioredis';
import { env } from '../../config/env';

let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      maxRetriesPerRequest: null, // Critical configuration for BullMQ
    });
  }
  return redisConnection;
}
