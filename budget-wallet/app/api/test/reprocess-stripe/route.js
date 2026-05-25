import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  const secret = request.headers.get('x-test-secret') || '';
  if (!process.env.TEST_API_SECRET || secret !== process.env.TEST_API_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await request.json();
    // store event
    const { error: e1 } = await supabase.from('webhook_events').upsert({
      provider: 'stripe',
      event_id: body.id || `test-${Date.now()}`,
      payload: body,
      received_at: new Date().toISOString(),
    }, { onConflict: ['provider', 'event_id'] });

    if (e1) return Response.json({ error: e1.message || 'DB error' }, { status: 500 });

    // Simple reconciliation for payment_intent.succeeded
    if (body.type === 'payment_intent.succeeded') {
      const pi = body.data?.object || {};
      const metadata = pi.metadata || {};
      const userId = metadata.user_id;
      if (userId) {
        const amount = pi.amount_received || pi.amount || 0;
        const currency = (pi.currency || 'usd').toUpperCase();
        const zeroDecimal = ['BIF','CLP','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF'];
        const displayAmount = zeroDecimal.includes(currency) ? Number(amount) : Number(amount) / 100;
        const description = metadata.description || `stripe:${pi.id}`;

        // dedupe
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: existing } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .eq('amount', displayAmount)
          .eq('category', 'Payment')
          .eq('description', description)
          .gte('created_at', fiveMinutesAgo)
          .limit(1);

        if (!existing || !existing.length) {
          const { data: transaction } = await supabase
            .from('transactions')
            .insert([
              { user_id: userId, amount: displayAmount, type: 'expense', category: 'Payment', description }
            ])
            .select()
            .single();

          if (transaction) {
            await supabase.from('invoices').insert([
              { user_id: userId, transaction_id: transaction.id, recipient: metadata.recipient || 'Stripe', amount: displayAmount, currency, description }
            ]);
          }
        }
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
