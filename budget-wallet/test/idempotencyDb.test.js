import { describe, it, expect } from 'vitest';
import { getIdempotencyDb, setIdempotencyDb } from '../lib/idempotencyDb';

function makeMockSupabase() {
  const table = new Map();
  return {
    from: (name) => ({
      select: () => ({
        eq: (k, v) => ({
          eq: (k2, v2) => ({
            single: async () => {
              const key = `${v}:${v2}`;
              const row = table.get(key);
              if (!row) return { data: null };
              return { data: row };
            },
          }),
        }),
      }),
      upsert: async (payload) => {
        const key = `${payload.user_id}:${payload.key}`;
        table.set(key, { response: payload.response, expires_at: payload.expires_at });
        return { data: payload };
      },
      delete: () => ({
        lt: async () => ({ data: [] }),
      }),
    }),
  };
}

describe('idempotencyDb', () => {
  it('stores and retrieves a response', async () => {
    const supabase = makeMockSupabase();
    const userId = 'user-1';
    const key = 'abc';
    const resp = { clientSecret: 'secret' };
    await setIdempotencyDb(supabase, userId, key, resp, 1000);
    const got = await getIdempotencyDb(supabase, userId, key);
    expect(got).toEqual(resp);
  });
});
