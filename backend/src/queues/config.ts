import dotenv from 'dotenv';

dotenv.config();

// Redis connection configuration - use simple connection with no auth
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: 0,
  lazyConnect: true,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Export config for BullMQ (it will create its own Redis connection)
export const redisConfigOptions = redisConfig;

// BullMQ queue configuration
export const queueConfig = {
  connection: redisConfigOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 5000,
      age: 7 * 24 * 3600, // 7 days
    },
  },
};
