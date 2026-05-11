'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

const CARD_STYLE = {
  style: {
    base: {
      color: 'var(--fg)',
      fontFamily: 'inherit',
      fontSize: '14px',
      '::placeholder': { color: 'var(--dim)' },
    },
    invalid: { color: 'var(--rose)' },
  },
};

function StripeForm({ amount, currency, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const res = await fetch('/api/payments/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency }),
      });
      const { clientSecret, error: serverError } = await res.json();
      if (serverError) throw new Error(serverError);

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });
      if (error) throw error;
      if (paymentIntent.status === 'succeeded') onSuccess();
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,.03)', border: '1px solid var(--line)', borderRadius: 12 }}>
        <CardElement options={CARD_STYLE} />
      </div>
      <button type="submit" disabled={loading || !stripe} className="btn btn-primary btn-block">
        {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
        {loading ? 'Processing…' : `Pay ${currency} ${parseFloat(amount).toLocaleString()}`}
      </button>
    </form>
  );
}

export default function StripePayment({ amount, currency, onSuccess, onError }) {
  if (!stripePromise) {
    return (
      <div style={{ padding: 16, background: 'rgba(251,113,133,.06)', border: '1px solid rgba(251,113,133,.2)', borderRadius: 12, fontSize: 12, color: 'var(--rose)' }}>
        Stripe not configured — add <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> and <code>STRIPE_SECRET_KEY</code> to <code>.env.local</code>
      </div>
    );
  }
  return (
    <Elements stripe={stripePromise}>
      <StripeForm amount={amount} currency={currency} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}
