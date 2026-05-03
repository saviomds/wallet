'use client';

import { useState } from 'react';
import { addTransaction } from '../lib/transactions';

export default function AddTransactionForm({ onAdded }) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await addTransaction({
        amount: parseFloat(amount),
        type,
        category,
        description,
      });
      
      // Clear the form fields after successful submission
      setAmount('');
      setCategory('');
      setDescription('');
      
      // Notify the dashboard to refresh the list
      if (onAdded) onAdded();
    } catch (error) {
      console.error(error);
      alert('Error adding transaction. (Check console or ensure you are logged in)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow space-y-4 text-black">
      <h2 className="text-lg font-bold">Add Transaction</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700">Amount</label>
        <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border p-2 rounded mt-1" placeholder="0.00" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border p-2 rounded mt-1">
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Category</label>
        <input type="text" required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border p-2 rounded mt-1" placeholder="e.g. Groceries" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border p-2 rounded mt-1" placeholder="Optional notes" />
      </div>
      <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full font-medium transition-colors">
        {loading ? 'Saving...' : 'Add Transaction'}
      </button>
    </form>
  );
}