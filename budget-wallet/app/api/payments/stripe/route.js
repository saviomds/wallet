import Stripe from 'stripe';
import { requireUser } from '../../../../lib/serverSupabase';
import { isRateLimited } from '../../../../lib/rateLimiter';
import { getIdempotencyDb, setIdempotencyDb } from '../../../../lib/idempotencyDb';

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
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const rl = await isRateLimited(`stripe:${ip}`, 10, 60_000);
    if (!rl.allowed) return Response.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });

    const auth = await requireUser(request);
    if (auth.error) return auth.error;

    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY to .env.local' }, { status: 503 });
    }

    const payload = await request.json();
    const parsed = parsePaymentInput(payload);
    if (parsed.error) return Response.json({ error: parsed.error }, { status: 400 });
    const { amount, currency } = parsed;

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Support idempotency via header and a server-side lookup
    const idempotencyKey = (request.headers.get('idempotency-key') || request.headers.get('Idempotency-Key') || '').trim() || undefined;
    if (idempotencyKey) {
      const cached = await getIdempotencyDb(auth.supabase, auth.user.id, idempotencyKey);
      if (cached) {
        return Response.json(cached);
      }
    }

    // Stripe requires integer cents; some currencies are zero-decimal
    const zeroDecimal = ['BIF','CLP','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF'];
    const unitAmount = zeroDecimal.includes((currency || 'USD').toUpperCase())
      ? Math.round(parseFloat(amount))
      : Math.round(parseFloat(amount) * 100);

    const metadata = {
      user_id: auth.user.id,
      client_transaction_id: payload?.client_transaction_id || payload?.clientTxnId || '',
      description: payload?.description || '',
      recipient: payload?.recipient || '',
    };

    const paymentIntent = await stripe.paymentIntents.create({
      amount: unitAmount,
      currency: (currency || 'USD').toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata,
    }, idempotencyKey ? { idempotencyKey } : undefined);

    const responseBody = { clientSecret: paymentIntent.client_secret };
    if (idempotencyKey) {
      try {
        await setIdempotencyDb(auth.supabase, auth.user.id, idempotencyKey, responseBody, 5 * 60 * 1000);
      } catch (e) {
        // don't fail the request if caching fails
      }
    }

    return Response.json(responseBody);
  } catch (err) {
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
