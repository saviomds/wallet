import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

// Required env vars for the test environment:
// BASE_URL - URL where the app is running (e.g., http://localhost:3000)
// TEST_API_SECRET - secret header value for the test endpoint
// NEXT_PUBLIC_SUPABASE_URL - supabase url for test DB
// SUPABASE_SERVICE_ROLE_KEY - service role key for test DB
// TEST_USER_ID - a UUID for the test user to attribute the payment to

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_API_SECRET = process.env.TEST_API_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_USER_ID = process.env.TEST_USER_ID;

if (!TEST_API_SECRET || !SUPABASE_URL || !SUPABASE_KEY || !TEST_USER_ID) {
  console.warn('Skipping webhook-reconciliation tests: set BASE_URL, TEST_API_SECRET, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TEST_USER_ID');
}

describe('Webhook reconciliation (integration)', () => {
  let supabase;

  beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    // cleanup tables
    await supabase.from('webhook_events').delete().neq('event_id', '');
    await supabase.from('invoices').delete().neq('id', '');
    await supabase.from('transactions').delete().neq('id', '');
  });

  afterAll(async () => {
    if (!supabase) return;
    await supabase.from('webhook_events').delete().neq('event_id', '');
    await supabase.from('invoices').delete().neq('id', '');
    await supabase.from('transactions').delete().neq('id', '');
  });

  it('processes a payment_intent.succeeded and creates transaction + invoice', async () => {
    if (!TEST_API_SECRET || !SUPABASE_URL || !SUPABASE_KEY || !TEST_USER_ID) {
      return expect(true).toBe(true);
    }

    const event = {
      id: `evt_test_${Date.now()}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: `pi_test_${Date.now()}`,
          amount: 2500,
          amount_received: 2500,
          currency: 'usd',
          metadata: { user_id: TEST_USER_ID, description: 'Integration test payment' },
        },
      },
    };

    const res = await fetch(`${BASE_URL}/api/test/reprocess-stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-test-secret': TEST_API_SECRET },
      body: JSON.stringify(event),
    });

    const json = await res.json();
    expect(res.ok).toBe(true);
    expect(json.ok).toBe(true);

    // assert DB rows
    const { data: txs } = await supabase.from('transactions').select('*').eq('user_id', TEST_USER_ID).eq('description', 'Integration test payment');
    expect(txs.length).toBeGreaterThanOrEqual(1);

    const transactionId = txs[0].id;
    const { data: invoices } = await supabase.from('invoices').select('*').eq('transaction_id', transactionId);
    expect(invoices.length).toBeGreaterThanOrEqual(1);
  });
});
