'use client';

import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

export default function PayPalPayment({ amount, currency, onSuccess, onError }) {
  if (!CLIENT_ID) {
    return (
      <div style={{ padding: 16, background: 'rgba(251,113,133,.06)', border: '1px solid rgba(251,113,133,.2)', borderRadius: 12, fontSize: 12, color: 'var(--rose)' }}>
        PayPal not configured — add <code>NEXT_PUBLIC_PAYPAL_CLIENT_ID</code>, <code>PAYPAL_CLIENT_ID</code>, and <code>PAYPAL_CLIENT_SECRET</code> to <code>.env.local</code>
      </div>
    );
  }

  // PayPal supports a limited currency list; fall back to USD
  const supported = ['AUD','BRL','CAD','CNY','CZK','DKK','EUR','HKD','HUF','ILS','JPY','MYR','MXN','NZD','NOK','PHP','PLN','GBP','SGD','SEK','CHF','THB','USD'];
  const ppCurrency = supported.includes((currency || 'USD').toUpperCase()) ? currency.toUpperCase() : 'USD';

  return (
    <PayPalScriptProvider options={{ clientId: CLIENT_ID, currency: ppCurrency }}>
      <PayPalButtons
        style={{ layout: 'vertical', shape: 'pill', label: 'pay' }}
        createOrder={async () => {
          const res = await fetch('/api/payments/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, currency: ppCurrency }),
          });
          const { orderId, error } = await res.json();
          if (error) throw new Error(error);
          return orderId;
        }}
        onApprove={async (data) => {
          const res = await fetch('/api/payments/paypal/capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: data.orderID }),
          });
          const detail = await res.json();
          if (detail.status === 'COMPLETED') {
            onSuccess();
          } else {
            onError('PayPal capture failed');
          }
        }}
        onError={(err) => onError(err.message || 'PayPal error')}
      />
    </PayPalScriptProvider>
  );
}
