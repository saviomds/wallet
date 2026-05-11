'use client';

import PayAndInvoice from '../PayAndInvoice';

export default function PayPage({ ctx }) {
  const { currency, onAdded } = ctx;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 4 }}>Money</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-.02em' }}>Pay & Invoice</h1>
      </div>
      <PayAndInvoice currency={currency} onAdded={onAdded} />
    </div>
  );
}
