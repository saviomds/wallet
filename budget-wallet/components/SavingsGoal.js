'use client';

import { useState, useEffect } from 'react';
import { updateUserSettings } from '../lib/transactions';

export default function SavingsGoal({ currentBalance, currency = 'MUR', exchangeRate = 1, initialGoal = 0 }) {
  const [goal, setGoal] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (initialGoal !== undefined) {
      const timer = setTimeout(() => {
        setGoal(initialGoal);
        setInputValue(initialGoal.toString());
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialGoal]);

  const handleSave = async (e) => {
    e.preventDefault();
    const newGoal = parseFloat(inputValue) || 0;
    setGoal(newGoal);
    setIsEditing(false);
    try {
      await updateUserSettings({ savings_goal: newGoal });
    } catch (error) {
      console.error('Failed to save goal:', error);
    }
  };

  const progress = goal > 0 ? Math.min((currentBalance / goal) * 100, 100) : 0;
  const isGoalMet = goal > 0 && currentBalance >= goal;

  const formatAmount = (amount) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency,
    }).format(amount * exchangeRate);
  };

  return (
    <div className="glass-card p-6">
      <div className="flex justify-between items-center mb-6 border-b border-card-border pb-3">
        <h2 className="text-xs font-bold tracking-widest uppercase text-gray-500">Savings Goal</h2>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="text-[10px] text-accent hover:text-accent-hover uppercase tracking-widest font-bold transition-colors">
            {goal > 0 ? 'Edit Goal' : 'Set Goal'}
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="flex items-center space-x-3 mb-2">
          <input type="number" step="0.01" min="0" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Target Amount" className="minimal-input p-2 flex-1" autoFocus />
          <button type="submit" className="bg-accent hover:bg-accent-hover text-white dark:text-black px-4 py-2 rounded-full transition-all text-[10px] uppercase tracking-widest font-bold shadow-md">Save</button>
          <button type="button" onClick={() => setIsEditing(false)} className="text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-foreground transition-colors">Cancel</button>
        </form>
      ) : goal > 0 ? (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Progress</span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-foreground">{formatAmount(currentBalance)} / {formatAmount(goal)}</span>
          </div>
          <div className="w-full bg-card border border-card-border rounded-full h-1.5 overflow-hidden">
            <div className={`h-1.5 rounded-full transition-all duration-1000 ease-out bg-accent`} style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-[10px] tracking-widest uppercase font-bold text-center text-gray-500 mt-2">
            {isGoalMet ? 'GOAL ACHIEVED' : `${progress.toFixed(1)}% REACHED`}
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">You havenot set a savings goal yet.</p>
      )}
    </div>
  );
}