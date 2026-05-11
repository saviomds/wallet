'use client';

import { useState } from 'react';

export default function MobileMoneyPayment({ amount, currency, onSuccess, onError }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [refId, setRefId] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/payments/mtn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, amount, currency }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRefId(data.referenceId);
      setPending(true);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (pending) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(212,175,55,.12)', border: '1px solid rgba(212,175,55,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
            <rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01"/>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Approval request sent</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
            Check your phone <strong style={{ color: 'var(--fg)' }}>{phone}</strong> and approve the MTN MoMo prompt to complete the payment.
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--dim)', letterSpacing: '.1em' }}>Ref: {refId.slice(0, 16)}…</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onSuccess} className="btn btn-primary" style={{ flex: 1, padding: '10px 14px' }}>I approved it</button>
          <button onClick={() => { setPending(false); onError('Payment cancelled'); }} className="btn btn-ghost" style={{ flex: 1, padding: '10px 14px' }}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div className="label">Mobile number (MSISDN)</div>
        <input
          className="input"
          type="tel"
          required
          placeholder="e.g. 250781234567"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
          Include country code without the + sign. Rwanda: 250, Uganda: 256, Ghana: 233
        </div>
      </div>
      <div style={{ padding: '12px 14px', background: 'rgba(212,175,55,.06)', border: '1px solid rgba(212,175,55,.2)', borderRadius: 12, fontSize: 12 }}>
        A payment prompt for <strong>{currency} {parseFloat(amount).toLocaleString()}</strong> will be sent to your phone.
      </div>
      <button type="submit" disabled={loading || !phone} className="btn btn-primary btn-block">
        {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}
        {loading ? 'Sending prompt…' : 'Send MoMo Request'}
      </button>
    </form>
  );
}
