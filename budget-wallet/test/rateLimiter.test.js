import { describe, it, expect, beforeEach } from 'vitest';
import { _resetBuckets, isRateLimited } from '../lib/rateLimiter';

describe('rateLimiter', () => {
  beforeEach(() => {
    _resetBuckets();
  });

  it('allows up to limit within window and then blocks', async () => {
    const key = 'test-ip';
    for (let i = 0; i < 10; i++) {
      const r = await isRateLimited(key, 10, 1000);
      expect(r.allowed).toBe(true);
    }
    const r2 = await isRateLimited(key, 10, 1000);
    expect(r2.allowed).toBe(false);
    expect(typeof r2.retryAfter).toBe('number');
  });
});
