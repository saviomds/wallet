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

export async function POST(request) {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    return Response.json({ error: 'PayPal not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env.local' }, { status: 503 });
  }

  try {
    const { amount, currency } = await request.json();
    const base = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';
    const token = await getPayPalToken();

    // PayPal supports a limited set of currencies; fall back to USD
    const supported = ['AUD','BRL','CAD','CNY','CZK','DKK','EUR','HKD','HUF','ILS','JPY','MYR','MXN','TWD','NZD','NOK','PHP','PLN','GBP','SGD','SEK','CHF','THB','USD'];
    const ppCurrency = supported.includes((currency || 'USD').toUpperCase()) ? currency.toUpperCase() : 'USD';

    const res = await fetch(`${base}/v2/checkout/orders`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: ppCurrency, value: parseFloat(amount).toFixed(2) } }],
      }),
    });
    const data = await res.json();
    return Response.json({ orderId: data.id });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
