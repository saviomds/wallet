'use client';

import AddTransactionForm from '../AddTransactionForm';

export default function AddPage({ ctx }) {
  const { editingTransaction, setEditingTransaction, onAdded, navigate } = ctx;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 560 }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 4 }}>Money</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-.02em' }}>
          {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
        </h1>
      </div>

      <AddTransactionForm
        onAdded={() => { onAdded(); if (!editingTransaction) navigate('ledger'); }}
        editingTransaction={editingTransaction}
        onCancelEdit={() => { setEditingTransaction(null); navigate('ledger'); }}
      />

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => navigate('ledger')}
          style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}
        >
          ← Back to Ledger
        </button>
      </div>
    </div>
  );
}
