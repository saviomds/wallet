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
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4 text-black dark:text-white">
      <h2 className="text-lg font-bold">{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
        <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 p-2 rounded mt-1" placeholder="0.00" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 rounded mt-1">
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
        <input type="text" required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 p-2 rounded mt-1" placeholder="e.g. Groceries" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 p-2 rounded mt-1" placeholder="Optional notes" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full font-medium transition-colors">
          {loading ? 'Saving...' : editingTransaction ? 'Update Transaction' : 'Add Transaction'}
        </button>
        {editingTransaction && (
          <button type="button" onClick={onCancelEdit} disabled={loading} className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded font-medium transition-colors w-1/3">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
