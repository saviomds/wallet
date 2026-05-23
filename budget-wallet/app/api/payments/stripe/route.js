import Stripe from 'stripe';
import { requireUser } from '../../../../lib/serverSupabase';

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
  const auth = await requireUser(request);
  if (auth.error) {
    return auth.error;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY to .env.local' }, { status: 503 });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const payload = parsePaymentInput(await request.json());
    if (payload.error) {
      return Response.json({ error: payload.error }, { status: 400 });
    }

    const { amount, currency } = payload;

    // Stripe requires integer cents; some currencies are zero-decimal
    const zeroDecimal = ['BIF','CLP','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF'];
    const unitAmount = zeroDecimal.includes((currency || 'USD').toUpperCase())
      ? Math.round(parseFloat(amount))
      : Math.round(parseFloat(amount) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: unitAmount,
      currency: (currency || 'USD').toLowerCase(),
      automatic_payment_methods: { enabled: true },
    });

    return Response.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
