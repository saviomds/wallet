import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) return Response.json({ error: 'Stripe webhook not configured' }, { status: 503 });

  const sig = request.headers.get('stripe-signature');
  const payload = await request.text();

  let event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { error } = await supabase.from('webhook_events').upsert({
      provider: 'stripe',
      event_id: event.id,
      payload: event,
      received_at: new Date().toISOString(),
    }, { onConflict: ['provider', 'event_id'] });

    if (error) {
      return Response.json({ error: error.message || 'DB error' }, { status: 500 });
    }

    // Handle payment_intent.succeeded: reconcile and persist payments
    if (event.type === 'payment_intent.succeeded') {
      try {
        const pi = event.data.object || {};
        const metadata = pi.metadata || {};

        const userId = metadata.user_id || null;
        const clientTxn = metadata.client_transaction_id || metadata.client_txn_id || null;

        // If we don't have a user mapping, skip reconciliation (can't attribute)
        if (userId) {
          // amount received in smallest currency unit
          const amountReceived = pi.amount_received || pi.amount || 0;
          const currency = (pi.currency || 'usd').toUpperCase();

          // convert to display amount
          const zeroDecimal = ['BIF','CLP','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF'];
          const displayAmount = zeroDecimal.includes(currency) ? Number(amountReceived) : Number(amountReceived) / 100;

          const paymentDescription = metadata.description || `stripe:${pi.id}`;

          // Duplicate-check window (5 minutes)
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          const { data: existing } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .eq('amount', displayAmount)
            .eq('category', 'Payment')
            .eq('description', paymentDescription)
            .gte('created_at', fiveMinutesAgo)
            .limit(1);

          if (!existing || !existing.length) {
            const { data: transaction } = await supabase
              .from('transactions')
              .insert([
                {
                  user_id: userId,
                  amount: displayAmount,
                  type: 'expense',
                  category: 'Payment',
                  description: paymentDescription,
                },
              ])
              .select()
              .single();

            if (transaction) {
              await supabase.from('invoices').insert([
                {
                  user_id: userId,
                  transaction_id: transaction.id,
                  recipient: metadata.recipient || 'Stripe',
                  amount: displayAmount,
                  currency: currency,
                  description: paymentDescription,
                },
              ]);
            }
          }
        }
      } catch (reconErr) {
        // don't block webhook processing; log server-side if available
      }
    }

    return Response.json({ received: true });
  } catch (err) {
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
