'use client';

import { useState, useEffect } from 'react';
import { updateUserSettings } from '../lib/transactions';

export default function SavingsGoal({ currentBalance, currency = 'MUR', exchangeRate = 1, initialGoal = 0 }) {
  const [goal, setGoal] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (initialGoal !== undefined) {
      setGoal(initialGoal);
      setInputValue(initialGoal.toString());
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
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-black dark:text-white border-t-4 border-purple-500">
      <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-2">
        <h2 className="text-lg font-bold">Savings Goal</h2>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-semibold">
            {goal > 0 ? 'Edit Goal' : 'Set Goal'}
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="flex items-center space-x-2">
          <input type="number" step="0.01" min="0" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Target amount (Base currency)" className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 rounded outline-none" autoFocus />
          <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded transition-colors">Save</button>
          <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white px-3 py-2 rounded transition-colors">Cancel</button>
        </form>
      ) : goal > 0 ? (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Progress</span>
            <span className="font-semibold">{formatAmount(currentBalance)} / {formatAmount(goal)}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3.5 overflow-hidden">
            <div className={`h-3.5 rounded-full transition-all duration-500 ${isGoalMet ? 'bg-green-500' : 'bg-purple-500'}`} style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
            {isGoalMet ? '🎉 Goal achieved! Great job!' : `${progress.toFixed(1)}% reached`}
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">You haven't set a savings goal yet.</p>
      )}
    </div>
  );
}