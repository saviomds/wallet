'use client';

import { useState, useEffect } from 'react';
import { addTransaction, updateTransaction } from '../lib/transactions';

export default function AddTransactionForm({ onAdded, editingTransaction, onCancelEdit }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, {
          amount: parseFloat(amount),
          type,
          category,
          description,
        });
      } else {
        await addTransaction({
          amount: parseFloat(amount),
          type,
          category,
          description,
        });
      }
      
      // Clear the form fields after successful submission
      setAmount('');
      setCategory('');
      setDescription('');
      
      if (editingTransaction && onCancelEdit) onCancelEdit();
      // Notify the dashboard to refresh the list
      if (onAdded) onAdded();
    } catch (error) {
      console.error(error);
      alert('Error saving transaction. (Check console or ensure you are logged in)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
      <h2 className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-6 border-b border-card-border pb-3">{editingTransaction ? 'Edit Entry' : 'New Entry'}</h2>
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Amount</label>
        <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="minimal-input p-2" placeholder="0.00" />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Transaction Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className="minimal-input p-2 cursor-pointer bg-transparent appearance-none">
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category</label>
        <input type="text" required value={category} onChange={(e) => setCategory(e.target.value)} className="minimal-input p-2" placeholder="e.g. Technology" />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="minimal-input p-2" placeholder="Optional details..." />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button type="submit" disabled={loading} className="bg-accent hover:bg-accent-hover text-white dark:text-black px-6 py-3 rounded-full w-full font-bold uppercase tracking-widest text-xs transition-all duration-300 shadow-lg shadow-accent/20">
          {loading ? 'Saving...' : editingTransaction ? 'Update Transaction' : 'Add Transaction'}
        </button>
        {editingTransaction && (
          <button type="button" onClick={onCancelEdit} disabled={loading} className="bg-card border border-card-border hover:border-accent text-foreground px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs transition-all duration-300 w-full sm:w-1/3">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
