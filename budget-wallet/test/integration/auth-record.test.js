import { describe, it, expect } from 'vitest';

describe('integration: auth + record (scaffold)', () => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  const base = process.env.BASE_URL || 'http://127.0.0.1:3000';

  if (!email || !password) {
    it('skips because no TEST_USER_EMAIL/TEST_USER_PASSWORD', () => {
      expect(true).toBe(true);
    });
    return;
  }

  it('can sign in and call record endpoint', async () => {
    // Sign in via the app API (adjust if your app uses a different auth flow)
    const signRes = await fetch(`${base}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    expect(signRes.ok).toBe(true);
    const sjson = await signRes.json();
    const token = sjson?.access_token || sjson?.accessToken || '';
    expect(token).toBeTruthy();

    // Attempt to record a test payment (uses authenticated record endpoint)
    const recRes = await fetch(`${base}/api/payments/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: 1.23, currency: 'USD', recipient: 'integration@test', description: 'integration test', method: 'card' }),
    });

    expect(recRes.ok).toBe(true);
    const j = await recRes.json();
    expect(j.transaction).toBeDefined();
  });
});
