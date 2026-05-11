'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'bw_onboarding_dismissed_v1';

export default function OnboardingChecklist({ transactions, settings }) {
  const [dismissed, setDismissed] = useState(true); // assume dismissed until we read storage

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  };

  if (dismissed) return null;

  const hasTransaction = (transactions || []).length > 0;
  const hasGoal = (settings?.savings_goal || 0) > 0;
  const hasBudget = Object.keys(settings?.category_budgets || {}).length > 0;

  const steps = [
    {
      done: hasTransaction,
      title: 'Add your first transaction',
      sub: 'Log income or an expense to begin tracking.',
      target: 'add-transaction',
    },
    {
      done: hasGoal,
      title: 'Set a savings goal',
      sub: 'Give your balance a target to climb toward.',
      target: 'savings-goal',
    },
    {
      done: hasBudget,
      title: 'Set a category budget',
      sub: 'Cap a category so overspend warnings can fire.',
      target: 'budget-limits',
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const pct = (completed / steps.length) * 100;

  // auto-dismiss when everything's checked
  if (completed === steps.length) {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, '1');
    return null;
  }

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="glass-card p-6 border-accent/30 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-card">
        <div className="h-full bg-accent transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex justify-between items-start mb-5">
        <div>
          <h2 className="text-[10px] font-black tracking-widest uppercase text-accent mb-1">Getting Started</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {completed} of {steps.length} complete · finish setup to unlock the full picture.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-[9px] uppercase tracking-widest font-bold text-gray-500 hover:text-foreground transition-colors shrink-0 ml-4"
        >
          Dismiss
        </button>
      </div>

      <ul className="space-y-3">
        {steps.map((s, i) => (
          <li key={i}>
            <button
              onClick={() => !s.done && scrollTo(s.target)}
              disabled={s.done}
              className={`w-full flex items-start gap-3 text-left p-3 rounded-xl border transition-all ${
                s.done
                  ? 'border-emerald-500/20 bg-emerald-500/5 cursor-default'
                  : 'border-card-border hover:border-accent hover:bg-accent/5 cursor-pointer'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  s.done ? 'border-emerald-500 bg-emerald-500' : 'border-gray-400'
                }`}
              >
                {s.done && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${s.done ? 'text-emerald-500 line-through' : 'text-foreground'}`}>
                  {s.title}
                </p>
                {!s.done && <p className="text-[10px] text-gray-500 mt-0.5">{s.sub}</p>}
              </span>
              {!s.done && (
                <svg className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
