'use client';

import { useState, useEffect } from 'react';
import { addTransaction, updateTransaction } from '../lib/transactions';
import { toast } from '../lib/toast';

const CATEGORIES = {
  expense: ['Food & Dining', 'Transport', 'Shopping', 'Bills & Utilities', 'Entertainment', 'Health & Medical', 'Housing & Rent', 'Education', 'Personal Care', 'Travel', 'Subscriptions', 'Insurance', 'Other'],
  income:  ['Salary', 'Freelance', 'Business', 'Investment Returns', 'Gift', 'Bonus', 'Rental Income', 'Side Income', 'Other'],
};

export default function AddTransactionForm({ onAdded, editingTransaction, onCancelEdit }) {
  const [amount,      setAmount]      = useState('');
  const [type,        setType]        = useState('expense');
  const [category,    setCategory]    = useState('');
  const [description, setDescription] = useState('');
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (editingTransaction) {
        setAmount(editingTransaction.amount);
        setType(editingTransaction.type);
        setCategory(editingTransaction.category || '');
        setDescription(editingTransaction.description || '');
      } else {
        setAmount('');
        setType('expense');
        setCategory('');
        setDescription('');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [editingTransaction]);

  // Reset category when type changes so stale value doesn't carry over
  const handleTypeChange = (t) => {
    setType(t);
    setCategory('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, { amount: parseFloat(amount), type, category, description });
        toast.success('Transaction updated');
      } else {
        await addTransaction({ amount: parseFloat(amount), type, category, description });
        toast.success(`${type === 'income' ? 'Income' : 'Expense'} recorded`);
      }
      setAmount('');
      setCategory('');
      setDescription('');
      if (editingTransaction && onCancelEdit) onCancelEdit();
      if (onAdded) onAdded();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || 'Could not save transaction');
    } finally {
      setLoading(false);
    }
  };

  const listId = `categories-${type}`;

  return (
    <div className="card">
      <div className="card-h">
        <h3>{editingTransaction ? 'Edit Entry' : 'New Entry'}</h3>
        {editingTransaction && (
          <button
            type="button"
            onClick={onCancelEdit}
            style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '.15em', textTransform: 'uppercase', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Cancel
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Type toggle */}
        <div>
          <div className="label">Type</div>
          <div className="seg" style={{ width: '100%' }}>
            {[{ v: 'expense', label: 'Expense' }, { v: 'income', label: 'Income' }].map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => handleTypeChange(opt.v)}
                className={type === opt.v ? 'on' : ''}
                style={{
                  flex: 1,
                  ...(type === opt.v && opt.v === 'expense' ? { background: 'var(--rose)',    color: '#fff' } : {}),
                  ...(type === opt.v && opt.v === 'income'  ? { background: 'var(--emerald)', color: '#000' } : {}),
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="label">Amount</label>
          <input
            type="number" step="0.01" min="0" required
            value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="input mono"
            style={{ fontSize: 20, fontWeight: 300, letterSpacing: '-.02em' }}
          />
        </div>

        {/* Category — combobox via datalist */}
        <div>
          <label className="label" htmlFor="category-input">
            Category
          </label>
          {/* Hidden datalist for autocomplete */}
          <datalist id={listId}>
            {CATEGORIES[type].map(c => <option key={c} value={c} />)}
          </datalist>
          <input
            id="category-input"
            type="text"
            required
            list={listId}
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder={`e.g. ${CATEGORIES[type][0]}`}
            className="input"
            autoComplete="off"
          />
          {/* Quick-pick chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {CATEGORIES[type].slice(0, 6).map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`chip${category === c ? ' on' : ''}`}
                style={{ fontSize: 10, padding: '4px 10px' }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="label">
            Description{' '}
            <span style={{ opacity: .5, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add a memo…"
            className="input"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary btn-block"
          style={{ marginTop: 4, opacity: loading ? .6 : 1 }}
        >
          {loading
            ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> Saving…</>
            : editingTransaction ? 'Update Transaction' : `Add ${type === 'income' ? 'Income' : 'Expense'}`
          }
        </button>
      </form>
    </div>
  );
}
