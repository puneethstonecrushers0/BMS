import Redis from 'ioredis';
import { ENV } from '../config/env.js';

let redisClient: Redis | null = null;
let isRedisAvailable = false;

try {
  redisClient = new Redis(ENV.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 3) {
        // Stop reconnecting aggressively if Redis server is not running locally
        return null;
      }
      return Math.min(times * 100, 1000);
    },
    lazyConnect: true,
  });

  redisClient.on('connect', () => {
    isRedisAvailable = true;
    console.log('[Redis Cache] Connected successfully to Redis server.');
  });

  redisClient.on('ready', () => {
    isRedisAvailable = true;
  });

  redisClient.on('close', () => {
    isRedisAvailable = false;
  });

  redisClient.on('error', (err) => {
    isRedisAvailable = false;
    // Log once without spamming
    if (err.message.includes('ECONNREFUSED')) {
      // Gentle notification: redis is optional in dev, fallback is active
    } else {
      console.warn(`[Redis Cache] Notice: ${err.message}`);
    }
  });

  // Attempt connection asynchronously
  redisClient.connect().catch(() => {
    isRedisAvailable = false;
    console.log('[Redis Cache] Redis is not reachable at ' + ENV.REDIS_URL + '. Continuing with direct database fallback.');
  });
} catch (e: any) {
  isRedisAvailable = false;
  console.log('[Redis Cache] Redis initialization bypassed. Using direct database.');
}

export const cache = {
  isReady(): boolean {
    return Boolean(isRedisAvailable && redisClient && (redisClient.status === 'ready' || redisClient.status === 'connect'));
  },

  async get<T>(key: string): Promise<T | null> {
    if (!this.isReady() || !redisClient) return null;
    try {
      const data = await redisClient.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    if (!this.isReady() || !redisClient) return;
    try {
      await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Ignore cache set failures
    }
  },

  /**
   * Transparent fetch-or-cache wrapper:
   * Returns cached value if available, else executes fetchFn, caches result, and returns it.
   */
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }
    const result = await fetchFn();
    if (result !== null && result !== undefined) {
      this.set(key, result, ttlSeconds).catch(() => {});
    }
    return result;
  },

  async del(key: string): Promise<void> {
    if (!this.isReady() || !redisClient) return;
    try {
      await redisClient.del(key);
    } catch {
      // Ignore cache del failures
    }
  },

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.isReady() || !redisClient) return;
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch {
      // Ignore pattern delete errors
    }
  },
};

export default cache;
