'use client';

import { useState, useEffect } from 'react';
import { updateUserSettings } from '../lib/transactions';

export default function BudgetLimits({ transactions = [], currency = 'MUR', exchangeRate = 1, initialBudgets = {} }) {
  const [budgets, setBudgets] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editCategory, setEditCategory] = useState('');
  const [editAmount, setEditAmount] = useState('');

  useEffect(() => {
    setBudgets(initialBudgets || {});
  }, [initialBudgets]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editCategory.trim()) return;
    
    const amount = parseFloat(editAmount) || 0;
    const newBudgets = { ...budgets };
    
    if (amount > 0) {
      newBudgets[editCategory.trim()] = amount;
    } else {
      delete newBudgets[editCategory.trim()];
    }
    
    setBudgets(newBudgets);
    setIsEditing(false);
    setEditCategory('');
    setEditAmount('');
    try {
      await updateUserSettings({ category_budgets: newBudgets });
    } catch (error) {
      console.error('Failed to save budget:', error);
    }
  };

  const handleDelete = async (category) => {
    const newBudgets = { ...budgets };
    delete newBudgets[category];
    setBudgets(newBudgets);
    try {
      await updateUserSettings({ category_budgets: newBudgets });
    } catch (error) {
      console.error('Failed to delete budget:', error);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount * exchangeRate);
  };

  // Calculate spending per category
  const spending = transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((acc, tx) => {
      const cat = tx.category || 'Uncategorized';
      acc[cat] = (acc[cat] || 0) + (parseFloat(tx.amount) || 0);
      return acc;
    }, {});

  const budgetCategories = Object.keys(budgets);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-black dark:text-white border-t-4 border-yellow-500">
      <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-2">
        <h2 className="text-lg font-bold">Category Budgets</h2>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="text-xs text-yellow-600 dark:text-yellow-500 hover:underline font-semibold">+ Add Limit</button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleSave} className="flex flex-col space-y-2 mb-4 bg-gray-50 dark:bg-gray-700 p-3 rounded-md border dark:border-gray-600">
          <div className="flex flex-col md:flex-row gap-2">
            <input type="text" required value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="Category (e.g. Food)" className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white p-2 rounded outline-none text-sm" />
            <input type="number" step="0.01" min="0" required value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="Limit amount" className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white p-2 rounded outline-none text-sm" />
          </div>
          <div className="flex justify-end space-x-2 mt-2">
            <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white px-3 py-1.5 rounded transition-colors text-sm">Cancel</button>
            <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded transition-colors text-sm font-medium">Save</button>
          </div>
        </form>
      )}

      {budgetCategories.length === 0 ? (
         <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">No budget limits set.</p>
      ) : (
        <div className="space-y-4">
          {budgetCategories.map(cat => {
            const limit = budgets[cat];
            const spent = spending[cat] || 0;
            const progress = Math.min((spent / limit) * 100, 100);
            const isOver = spent >= limit;
            const isWarning = progress >= 80 && !isOver;

            let colorClass = 'bg-green-500';
            if (isOver) colorClass = 'bg-red-500';
            else if (isWarning) colorClass = 'bg-yellow-500';

            return (
              <div key={cat} className="space-y-1">
                <div className="flex justify-between items-end text-sm">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {cat} <button onClick={() => handleDelete(cat)} className="text-red-500 hover:text-red-700 ml-1 text-xs opacity-50 hover:opacity-100" title="Remove budget">✕</button>
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    <span className={isOver ? 'text-red-600 dark:text-red-400 font-bold' : ''}>{formatAmount(spent)}</span> / {formatAmount(limit)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-2.5 rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}