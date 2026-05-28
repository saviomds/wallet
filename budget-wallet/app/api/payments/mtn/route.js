import { requireUser } from '../../../../lib/serverSupabase';
import { isRateLimited } from '../../../../lib/rateLimiter';

export async function POST(request) {
  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  if (!process.env.MTN_SUBSCRIPTION_KEY || !process.env.MTN_API_USER || !process.env.MTN_API_KEY) {
    return Response.json({ error: 'MTN MoMo not configured. Add MTN_SUBSCRIPTION_KEY, MTN_API_USER, MTN_API_KEY to .env.local' }, { status: 503 });
  }

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const rl = await isRateLimited(`mtn:${ip}`, 8, 60_000);
    if (!rl.allowed) return Response.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });

    const body = await request.json();
    const phone = String(body?.phone || '').replace(/\D/g, '');
    const amount = Number(body?.amount);
    const currency = String(body?.currency || 'EUR').trim().toUpperCase();

    if (!/^\d{8,15}$/.test(phone)) {
      return Response.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      return Response.json({ error: 'Invalid currency' }, { status: 400 });
    }

    const base = process.env.MTN_BASE_URL || 'https://sandbox.momodeveloper.mtn.com';
    const env = process.env.MTN_ENVIRONMENT || 'sandbox';

    // Get access token
    const creds = Buffer.from(`${process.env.MTN_API_USER}:${process.env.MTN_API_KEY}`).toString('base64');
    const tokenRes = await fetch(`${base}/collection/token/`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${creds}`,
        'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY,
      },
    });
    const { access_token } = await tokenRes.json();

    // Initiate request-to-pay
    const referenceId = crypto.randomUUID();
    const payRes = await fetch(`${base}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'X-Reference-Id': referenceId,
        'X-Target-Environment': env,
        'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: String(Math.round(amount)),
        currency,
        externalId: referenceId,
        payer: { partyIdType: 'MSISDN', partyId: phone },
        payerMessage: 'B1Overs Wallet Payment',
        payeeNote: 'Payment via B1Overs Wallet',
      }),
    });

    if (!payRes.ok) {
      const err = await payRes.text();
      return Response.json({ error: `MTN API error: ${err}` }, { status: 400 });
    }

    return Response.json({ referenceId, status: 'pending' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
