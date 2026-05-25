'use client';

import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';

const FLW_KEY = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY;

const supported = ['NGN','GHS','KES','ZAR','USD','EUR','GBP','TZS','UGX','RWF','ZMW','MWK'];

// Inner component — only rendered when key exists, so the hook is always called
function FlutterwaveCheckout({ amount, currency, recipient, description, onSuccess, onError }) {
  const flwCurrency = supported.includes((currency || 'USD').toUpperCase()) ? currency.toUpperCase() : 'USD';

  const handleFlutterPayment = useFlutterwave({
    public_key: FLW_KEY,
    /* eslint-disable-next-line react-hooks/purity */
    tx_ref: `b1overs-${Date.now()}`,
    amount: parseFloat(amount),
    currency: flwCurrency,
    payment_options: 'card,banktransfer,mobilemoney',
    customer: { name: recipient || 'Customer' },
    customizations: {
      title: 'B1Overs Wallet',
      description: description || 'Payment',
      logo: '/apple-touch-icon.png',
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: '12px 14px', background: 'rgba(21,93,252,.07)', border: '1px solid rgba(21,93,252,.22)', borderRadius: 12, fontSize: 12 }}>
        Opens a secure Flutterwave window supporting cards, bank transfer, and mobile money.
      </div>
      <button
        className="btn btn-primary btn-block"
        onClick={() => handleFlutterPayment({
          callback: (response) => {
            closePaymentModal();
            if (response.status === 'successful') onSuccess();
            else onError('Payment was not completed');
          },
          onClose: () => {},
        })}
      >
        Open Checkout — {currency} {parseFloat(amount).toLocaleString()}
      </button>
    </div>
  );
}

export default function FlutterwavePayment(props) {
  if (!FLW_KEY) {
    return (
      <NotConfigured label="Flutterwave" envKey="NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY" />
    );
  }
  return <FlutterwaveCheckout {...props} />;
}

function NotConfigured({ label, envKey }) {
  return (
    <div style={{ padding: '14px 16px', background: 'rgba(21,93,252,.07)', border: '1px solid rgba(21,93,252,.22)', borderRadius: 12, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
      <strong style={{ color: 'var(--fg)' }}>{label}</strong> not configured yet — add{' '}
      <code style={{ color: 'var(--accent)', fontSize: 11 }}>{envKey}</code> to <code style={{ fontSize: 11 }}>.env.local</code> to activate.
    </div>
  );
}
