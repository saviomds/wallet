import Stripe from 'stripe';

export async function POST(request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY to .env.local' }, { status: 503 });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { amount, currency } = await request.json();

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
