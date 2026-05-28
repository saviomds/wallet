import { describe, it, expect, beforeEach } from 'vitest';
import { getIdempotencyDb, setIdempotencyDb } from '../lib/idempotencyDb';

// Minimal fake Supabase client (in-memory)
function createFakeSupabase() {
  const store = new Map();
  return {
    from: (table) => ({
      select: () => ({
        eq: (col, val) => ({
          eq: (col2, val2) => ({
            single: async () => {
              const key = `${val}:${val2}`; // userId:key
              const row = store.get(key) || null;
              if (!row) return { data: null, error: { code: 'PGRST116' } };
              return { data: row, error: null };
            }
          })
        })
      }),
      upsert: async (payload, opts) => {
        const key = `${payload.user_id}:${payload.key}`;
        store.set(key, { response: payload.response, expires_at: payload.expires_at });
        return { data: payload, error: null };
      },
      insert: async (arr) => {
        const payload = arr[0];
        const key = `${payload.user_id}:${payload.key ?? payload.email ?? payload.token ?? ''}`;
        store.set(key, payload);
        return { data: payload, error: null };
      },
      delete: async () => ({ data: null, error: null }),
    }),
  };
}

describe('idempotencyDb helpers', () => {
  it('stores and retrieves a cached response', async () => {
    const supabase = createFakeSupabase();
    await setIdempotencyDb(supabase, 'user1', 'key1', { orderId: 'o1' }, 10000);
    const got = await getIdempotencyDb(supabase, 'user1', 'key1');
    expect(got).toEqual({ orderId: 'o1' });
  });

  it('returns null for missing keys', async () => {
    const supabase = createFakeSupabase();
    const got = await getIdempotencyDb(supabase, 'userX', 'missing');
    expect(got).toBeNull();
  });
});
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
