import { createClient } from '@supabase/supabase-js';

async function getPayPalToken() {
  const base = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';
  const creds = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  return data.access_token;
}

export async function POST(request) {
  const raw = await request.text();
  const event = JSON.parse(raw || '{}');

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    return Response.json({ error: 'PayPal not configured' }, { status: 503 });
  }

  // Extract required headers for verification
  const transmissionId = request.headers.get('paypal-transmission-id') || request.headers.get('paypal-transmission-id'.toLowerCase());
  const transmissionTime = request.headers.get('paypal-transmission-time');
  const certUrl = request.headers.get('paypal-cert-url');
  const authAlgo = request.headers.get('paypal-auth-algo');
  const transmissionSig = request.headers.get('paypal-transmission-sig');
  const webhookId = process.env.PAYPAL_WEBHOOK_ID; // set this in env for the webhook

  const token = await getPayPalToken();
  const base = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

  const verifyRes = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: webhookId,
      webhook_event: event,
    }),
  });

  const verifyData = await verifyRes.json();
  if (verifyData.verification_status !== 'SUCCESS') {
    return Response.json({ error: 'Invalid PayPal webhook signature' }, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  try {
    const { error } = await supabase.from('webhook_events').upsert({
      provider: 'paypal',
      event_id: event?.id || event?.resource?.id || `${Date.now()}`,
      payload: event,
      received_at: new Date().toISOString(),
    }, { onConflict: ['provider', 'event_id'] });

    if (error) return Response.json({ error: error.message || 'DB error' }, { status: 500 });

    // Reconciliation: attempt to persist completed payments
    try {
      const type = event.event_type || '';
      const resource = event.resource || {};

      const pu = (resource.purchase_units && resource.purchase_units[0]) || (resource?.resource?.purchase_units && resource.resource.purchase_units[0]) || null;
      const reference = pu?.reference_id || pu?.custom_id || resource?.invoice_id || null;
      let userId = null;
      if (reference && reference.includes(':')) {
        userId = reference.split(':')[0];
      }

      // extract amount
      let amountObj = resource.amount || pu?.amount || pu?.payments?.captures?.[0]?.amount || resource?.purchase_units?.[0]?.payments?.captures?.[0]?.amount || null;
      const value = amountObj?.value || null;
      const currency = (amountObj?.currency_code || amountObj?.currency || 'USD').toUpperCase();
      const displayAmount = value ? Number(value) : null;

      if (userId && displayAmount) {
        // Duplicate-check (5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const paymentDescription = pu?.description || resource?.id || `paypal:${event.id}`;

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
                recipient: pu?.payee?.email_address || resource?.payer?.email_address || 'PayPal',
                amount: displayAmount,
                currency: currency,
                description: paymentDescription,
              },
            ]);
          }
        }
      }
    } catch (reconErr) {
      // swallow to avoid webhook retries; log server-side if logging available
    }

    return Response.json({ received: true });
  } catch (err) {
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
