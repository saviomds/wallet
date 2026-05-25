import { requireUser } from '../../../../../lib/serverSupabase';
import { isRateLimited } from '../../../../../lib/rateLimiter';

async function getPayPalToken() {
  const base = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';
  const creds = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  return data.access_token;
}

function parsePaymentInput(body) {
  const amount = Number(body?.amount);
  const currency = String(body?.currency || 'USD').trim().toUpperCase();

  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Invalid amount' };
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    return { error: 'Invalid currency' };
  }

  return { amount, currency };
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const rl = isRateLimited(`paypal:create:${ip}`, 10, 60_000);
  if (!rl.allowed) return Response.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });

  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    return Response.json({ error: 'PayPal not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env.local' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const payload = parsePaymentInput(body);
    if (payload.error) {
      return Response.json({ error: payload.error }, { status: 400 });
    }

    const { amount, currency } = payload;
    const clientTxn = String(body?.client_transaction_id || body?.clientTxnId || '').trim();
    const description = String(body?.description || '').trim();
    const recipient = String(body?.recipient || '').trim();
    const base = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';
    const token = await getPayPalToken();

    // PayPal supports a limited set of currencies; fall back to USD
    const supported = ['AUD','BRL','CAD','CNY','CZK','DKK','EUR','HKD','HUF','ILS','JPY','MYR','MXN','TWD','NZD','NOK','PHP','PLN','GBP','SGD','SEK','CHF','THB','USD'];
    const ppCurrency = supported.includes(currency) ? currency : 'USD';

    const res = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: `${auth.user.id}:${clientTxn}`,
          description: description || undefined,
          custom_id: clientTxn || undefined,
          amount: { currency_code: ppCurrency, value: amount.toFixed(2) },
        }],
      }),
    });
    const data = await res.json();
    return Response.json({ orderId: data.id });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
