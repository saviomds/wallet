'use client';

import { useState, useEffect } from 'react';
import { updateUserSettings } from '../lib/transactions';
import { toast } from '../lib/toast';

export default function SavingsGoal({ currentBalance, currency = 'MUR', exchangeRate = 1, initialGoal = 0 }) {
  const [goal, setGoal] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    try {
      await updateUserSettings({ savings_goal: newGoal });
      setGoal(newGoal);
      setIsEditing(false);
      toast.success(newGoal > 0 ? 'Savings goal updated' : 'Goal cleared');
    } catch (error) {
      console.error(error);
      toast.error('Could not save goal');
    } finally {
      setSaving(false);
    }
  };

  const fmt = (amount) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount * exchangeRate);

  const progress = goal > 0 ? Math.min((currentBalance / goal) * 100, 100) : 0;
  const isGoalMet = goal > 0 && currentBalance >= goal;
  const remaining = Math.max(goal - currentBalance, 0);

  return (
    <div className="card">
      <div className="card-h">
        <h3>Savings Goal</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '.15em', textTransform: 'uppercase', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {goal > 0 ? 'Edit' : 'Set Goal'}
          </button>
        )}
      </div>

      <div className="card-b">
        {isEditing ? (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div className="label">Target amount</div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="0.00"
                className="input mono"
                style={{ fontSize: 20, fontWeight: 300 }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{ flex: 1, opacity: saving ? .6 : 1 }}
              >
                {saving ? 'Saving…' : 'Save Goal'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="btn btn-ghost"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : goal > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Numbers */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div className="label" style={{ marginBottom: 4 }}>Current balance</div>
                <div className="mono" style={{ fontSize: 20, fontWeight: 300 }}>
                  {fmt(Math.max(currentBalance, 0))}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="label" style={{ marginBottom: 4 }}>Goal</div>
                <div className="mono" style={{ fontSize: 20, fontWeight: 300, color: 'var(--muted)' }}>
                  {fmt(goal)}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="bar-track">
                <div
                  className={`bar-fill${isGoalMet ? ' green' : ''}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: isGoalMet ? 'var(--emerald)' : 'var(--muted)', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                {isGoalMet ? '✓ Goal reached!' : `${progress.toFixed(1)}% reached`}
              </span>
              {!isGoalMet && (
                <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                  {fmt(remaining)} to go
                </span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>
            No savings goal set yet.
          </div>
        )}
      </div>
    </div>
  );
}
