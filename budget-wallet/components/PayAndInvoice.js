'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { jsPDF } from 'jspdf';
import { addTransaction } from '../lib/transactions';
import { toast } from '../lib/toast';

const StripePayment      = dynamic(() => import('./payments/StripePayment'),      { ssr: false });
const PayPalPayment      = dynamic(() => import('./payments/PayPalPayment'),      { ssr: false });
const MobileMoneyPayment = dynamic(() => import('./payments/MobileMoneyPayment'), { ssr: false });
const FlutterwavePayment = dynamic(() => import('./payments/FlutterwavePayment'), { ssr: false });

const METHODS = [
  {
    id: 'card',
    label: 'Card',
    sub: 'Visa · Mastercard · Amex',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
        <rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>
      </svg>
    ),
  },
  {
    id: 'paypal',
    label: 'PayPal',
    sub: 'PayPal balance or card',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20 }}>
        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c1.379 8.874-5.23 11.152-9.87 11.152H9.19l-.83 5.271h3.79c.524 0 .968-.382 1.05-.9l.792-5.013c.082-.518.526-.9 1.05-.9h.663c4.298 0 7.664-1.747 8.647-6.797.31-1.585.07-2.886-.93-3.272z"/>
      </svg>
    ),
  },
  {
    id: 'mobile',
    label: 'Mobile Money',
    sub: 'MTN MoMo · M-Pesa',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
        <rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>
      </svg>
    ),
  },
  {
    id: 'bank',
    label: 'Bank Transfer',
    sub: 'Direct bank via Flutterwave',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
        <path d="M3 22h18M6 18V11M10 18V11M14 18V11M18 18V11M12 2l9 4H3l9-4z"/>
      </svg>
    ),
  },
];

export default function PayAndInvoice({ currency, onAdded }) {
  const [method, setMethod]           = useState('card');
  const [recipient, setRecipient]     = useState('');
  const [amount, setAmount]           = useState('');
  const [description, setDescription] = useState('');
  const [paying, setPaying]           = useState(false);
  const [success, setSuccess]         = useState(false);

  const detailsComplete = recipient.trim() && parseFloat(amount) > 0 && description.trim();

  const handleSuccess = async () => {
    try {
      await addTransaction({
        amount: parseFloat(amount),
        type: 'expense',
        category: 'Payment',
        description: `${METHODS.find(m => m.id === method)?.label} · ${recipient} · ${description}`,
      });
      if (onAdded) onAdded();
    } catch {}
    toast.success(`Payment to ${recipient} completed`);
    setPaying(false);
    setSuccess(true);
  };

  const handleError = (msg) => {
    toast.error(msg || 'Payment failed');
    setPaying(false);
  };

  const reset = () => {
    setRecipient('');
    setAmount('');
    setDescription('');
    setMethod('card');
    setPaying(false);
    setSuccess(false);
  };

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      const methodLabel = METHODS.find(m => m.id === method)?.label || method;
      const safeName = recipient.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.setFontSize(22);
      doc.text('PAYMENT RECEIPT', 105, 25, null, null, 'center');
      doc.setFontSize(12);
      doc.text(`From: B1Overs Wallet`, 20, 45);
      doc.text(`To: ${recipient}`, 20, 55);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 65);
      doc.text(`Method: ${methodLabel}`, 20, 75);
      doc.text(`Description: ${description}`, 20, 85);
      doc.setFontSize(16);
      doc.text(`Amount: ${currency} ${parseFloat(amount).toLocaleString()}`, 20, 105);
      doc.save(`receipt_${safeName}.pdf`);
      toast.success('Receipt downloaded');
    } catch {
      toast.error('Could not generate PDF');
    }
  };

  // ── Success screen ───────────────────────────────────────────────────────────
  if (success) {
    const invoiceText = `Payment Receipt%0A%0ATo: ${recipient}%0AAmount: ${currency} ${amount}%0ADescription: ${description}%0ADate: ${new Date().toLocaleDateString()}`;
    return (
      <div className="card">
        <div className="card-b" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--emerald)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>Payment Complete</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 300 }}>{currency} {parseFloat(amount).toLocaleString()}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>to {recipient}</div>
          </div>
          <div style={{ height: 1, background: 'var(--line)', width: '100%' }} />
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Share receipt</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href={`mailto:?subject=Payment Receipt&body=${invoiceText}`} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '10px 14px' }}>Email</a>
              <a href={`https://wa.me/?text=${invoiceText}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '10px 14px', borderColor: '#25D366', color: '#25D366' }}>WhatsApp</a>
            </div>
            <button onClick={downloadPDF} className="btn btn-ghost btn-block" style={{ padding: '10px 14px' }}>Download PDF Receipt</button>
          </div>
          <button onClick={reset} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, cursor: 'pointer', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700 }}>
            Make another payment
          </button>
        </div>
      </div>
    );
  }

  // ── Payment form ─────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Details */}
      <div className="card">
        <div className="card-h"><h3>Payment details</h3></div>
        <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="label">Recipient name or email</div>
            <input className="input" type="text" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="john@example.com" />
          </div>
          <div>
            <div className="label">Amount ({currency})</div>
            <input className="input" type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <div className="label">Description</div>
            <input className="input" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Services, goods, invoice #…" />
          </div>
        </div>
      </div>

      {/* Method selection — always visible */}
      <div className="card">
        <div className="card-h"><h3>Payment method</h3></div>
        <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {METHODS.map(m => (
              <button
                key={m.id}
                onClick={() => { setMethod(m.id); setPaying(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  borderRadius: 12, cursor: 'pointer', textAlign: 'left', transition: 'all .15s ease',
                  border: `1px solid ${method === m.id ? 'var(--accent)' : 'var(--line)'}`,
                  background: method === m.id ? 'var(--accent-soft)' : 'transparent',
                  color: method === m.id ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                {m.icon}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: method === m.id ? 'var(--accent)' : 'var(--fg)' }}>{m.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{m.sub}</div>
                </div>
              </button>
            ))}
          </div>

          <div style={{ height: 1, background: 'var(--line)' }} />

          {/* Pay button — opens the provider UI */}
          {!paying && (
            <button
              className="btn btn-primary btn-block"
              disabled={!detailsComplete}
              onClick={() => setPaying(true)}
              style={{ opacity: detailsComplete ? 1 : 0.4 }}
            >
              {!detailsComplete ? 'Fill in details above to continue' : `Pay with ${METHODS.find(m => m.id === method)?.label}`}
            </button>
          )}

          {/* Provider UI — shown after clicking Pay */}
          {paying && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {method === 'card'   && <StripePayment      amount={amount} currency={currency} onSuccess={handleSuccess} onError={handleError} />}
              {method === 'paypal' && <PayPalPayment      amount={amount} currency={currency} onSuccess={handleSuccess} onError={handleError} />}
              {method === 'mobile' && <MobileMoneyPayment amount={amount} currency={currency} onSuccess={handleSuccess} onError={handleError} />}
              {method === 'bank'   && <FlutterwavePayment amount={amount} currency={currency} recipient={recipient} description={description} onSuccess={handleSuccess} onError={handleError} />}
              <button onClick={() => setPaying(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 11, cursor: 'pointer', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 700 }}>
                ← Change method
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
