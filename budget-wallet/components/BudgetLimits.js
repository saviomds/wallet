'use client';

import { useState, useEffect } from 'react';
import { updateUserSettings } from '../lib/transactions';

export default function BudgetLimits({ transactions = [], currency = 'MUR', exchangeRate = 1, initialBudgets = {} }) {
  const [budgets, setBudgets] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editCategory, setEditCategory] = useState('');
  const [editAmount, setEditAmount] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setBudgets(initialBudgets || {}), 0);
    return () => clearTimeout(timer);
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
    <div className="glass-card p-6">
      <div className="flex justify-between items-center mb-6 border-b border-card-border pb-3">
        <h2 className="text-xs font-bold tracking-widest uppercase text-gray-500">Category Budgets</h2>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="text-[10px] text-accent hover:text-accent-hover uppercase tracking-widest font-bold transition-colors">+ Add Limit</button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleSave} className="flex flex-col space-y-4 mb-6 bg-card border border-card-border p-4 rounded-xl">
          <div className="flex flex-col md:flex-row gap-4">
            <input type="text" required value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="Category (e.g. Food)" className="minimal-input p-2 flex-1 text-sm" />
            <input type="number" step="0.01" min="0" required value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="Limit amount" className="minimal-input p-2 flex-1 text-sm" />
          </div>
          <div className="flex justify-end space-x-3 mt-2">
            <button type="button" onClick={() => setIsEditing(false)} className="text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-foreground transition-colors px-3 py-2">Cancel</button>
            <button type="submit" className="bg-accent hover:bg-accent-hover text-white dark:text-black px-5 py-2 rounded-full transition-all text-[10px] uppercase tracking-widest font-bold shadow-md">Save</button>
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

            let colorClass = 'bg-accent';
            if (isOver) colorClass = 'bg-red-500';
            else if (isWarning) colorClass = 'bg-orange-400';

            return (
              <div key={cat} className="space-y-1">
                <div className="flex justify-between items-end text-sm">
                  <span className="font-bold text-foreground">
                    {cat} <button onClick={() => handleDelete(cat)} className="text-gray-400 hover:text-red-500 ml-2 text-xs transition-colors" title="Remove budget">✕</button>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    <span className={isOver ? 'text-red-500' : 'text-foreground'}>{formatAmount(spent)}</span> / {formatAmount(limit)}
                  </span>
                </div>
                <div className="w-full bg-card border border-card-border rounded-full h-1.5 overflow-hidden">
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