import { describe, it, expect } from 'vitest';
import { cache } from '../database/redis.js';

describe('Redis Cache & Database Fallback Resilience', () => {
  it('executes fallback database query function when cache is offline or missed', async () => {
    let queryCount = 0;
    const fetchFromDb = async () => {
      queryCount += 1;
      return { id: 'buyer-1', name: 'ABC Construction', active: true };
    };

    const result = await cache.getOrSet('test:buyer:1', fetchFromDb, 60);

    expect(result).toBeDefined();
    expect(result.name).toBe('ABC Construction');
    expect(queryCount).toBe(1);
  });

  it('safely handles pattern invalidation without throwing errors when offline', async () => {
    await expect(cache.invalidatePattern('test:*')).resolves.not.toThrow();
  });

  it('safely handles get, set, and del without crashing', async () => {
    await expect(cache.set('test:key', { val: 123 }, 30)).resolves.not.toThrow();
    const val = await cache.get('test:key');
    // If Redis is offline, get returns null; if online, returns parsed object
    expect(val === null || (val as any).val === 123).toBe(true);
    await expect(cache.del('test:key')).resolves.not.toThrow();
  });
});
