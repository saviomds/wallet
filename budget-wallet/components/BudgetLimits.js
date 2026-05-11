'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { updateUserSettings } from '../lib/transactions';
import { toast } from '../lib/toast';

export default function BudgetLimits({ transactions = [], currency = 'MUR', exchangeRate = 1, initialBudgets = {} }) {
  const [budgets,       setBudgets]       = useState({});
  const [isEditing,     setIsEditing]     = useState(false);
  const [editCategory,  setEditCategory]  = useState('');
  const [editAmount,    setEditAmount]    = useState('');

  // Track which alert level we've already fired per category so toasts don't repeat on re-render
  const firedAlerts = useRef({});

  useEffect(() => {
    const timer = setTimeout(() => setBudgets(initialBudgets || {}), 0);
    return () => clearTimeout(timer);
  }, [initialBudgets]);

  const persist = async (next) => {
    try {
      await updateUserSettings({ category_budgets: next });
    } catch {
      toast.error('Could not save budget');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editCategory.trim()) return;
    const amount = parseFloat(editAmount) || 0;
    const next = { ...budgets };
    const key = editCategory.trim();
    if (amount > 0) next[key] = amount;
    else delete next[key];
    setBudgets(next);
    setIsEditing(false);
    setEditCategory('');
    setEditAmount('');
    await persist(next);
    toast.success(amount > 0 ? `Budget set for ${key}` : `Budget removed for ${key}`);
  };

  const handleDelete = async (category) => {
    const next = { ...budgets };
    delete next[category];
    setBudgets(next);
    await persist(next);
    toast.info(`Removed ${category} budget`);
  };

  const fmt = (amount) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount * exchangeRate);

  const { spending, priorSpending } = useMemo(() => {
    const now = Date.now();
    const DAY = 86400000;
    const cur = {}, prev = {};
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      const cat = tx.category || 'Uncategorized';
      const amt = parseFloat(tx.amount) || 0;
      const age = now - new Date(tx.created_at).getTime();
      if (age <= 30 * DAY)       cur[cat]  = (cur[cat]  || 0) + amt;
      else if (age <= 60 * DAY)  prev[cat] = (prev[cat] || 0) + amt;
    }
    return { spending: cur, priorSpending: prev };
  }, [transactions]);

  // ── Budget alerts ──────────────────────────────────────────────────────────
  useEffect(() => {
    for (const [cat, limit] of Object.entries(budgets)) {
      const spent   = spending[cat] || 0;
      const pct     = limit > 0 ? (spent / limit) * 100 : 0;
      const prev    = firedAlerts.current[cat] || 0; // 0 = none, 80 = warning fired, 100 = over fired

      if (pct >= 100 && prev < 100) {
        toast.show({
          message: `⚠️ Over budget: ${cat} (${fmt(spent)} / ${fmt(limit)})`,
          type: 'error',
          duration: 7000,
        });
        firedAlerts.current[cat] = 100;
      } else if (pct >= 80 && prev < 80) {
        toast.show({
          message: `🔔 ${cat} is at ${pct.toFixed(0)}% of budget`,
          type: 'info',
          duration: 6000,
        });
        firedAlerts.current[cat] = 80;
      } else if (pct < 80 && prev > 0) {
        // Reset alert state if spending drops (e.g. after undo)
        firedAlerts.current[cat] = 0;
      }
    }
  }, [spending, budgets]);

  const budgetCategories = Object.keys(budgets);
  const overspentCats    = budgetCategories.filter(c => (spending[c] || 0) > budgets[c]);

  return (
    <div className="card">
      <div className="card-h">
        <h3>Category Budgets</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            + Add Limit
          </button>
        )}
      </div>

      <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Overspend banner */}
        {overspentCats.length > 0 && (
          <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(251,113,133,.06)', border: '1px solid rgba(251,113,133,.25)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--rose)', marginBottom: 2 }}>Over budget</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {overspentCats.slice(0, 3).join(', ')}{overspentCats.length > 3 ? ` +${overspentCats.length - 3} more` : ''}
              </div>
            </div>
          </div>
        )}

        {/* Add form */}
        {isEditing && (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', background: 'rgba(255,255,255,.02)', border: '1px solid var(--line)', borderRadius: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="label">Category</div>
                <input type="text" required value={editCategory} onChange={e => setEditCategory(e.target.value)} placeholder="e.g. Food" className="input" />
              </div>
              <div>
                <div className="label">Monthly limit</div>
                <input type="number" step="0.01" min="0" required value={editAmount} onChange={e => setEditAmount(e.target.value)} placeholder="0.00" className="input mono" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setIsEditing(false)} className="btn btn-ghost" style={{ padding: '7px 14px' }}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ padding: '7px 14px' }}>Save</button>
            </div>
          </form>
        )}

        {/* Budget list */}
        {budgetCategories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>
            No budget limits set yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {budgetCategories.map(cat => {
              const limit    = budgets[cat];
              const spent    = spending[cat]      || 0;
              const prior    = priorSpending[cat] || 0;
              const progress = Math.min((spent / limit) * 100, 100);
              const isOver   = spent >= limit;
              const isWarn   = progress >= 80 && !isOver;

              const fillColor = isOver ? 'var(--rose)' : isWarn ? '#fb923c' : 'var(--accent)';

              let trend = null;
              if (prior > 0) {
                const change = ((spent - prior) / prior) * 100;
                if (Math.abs(change) >= 5) trend = { change, up: change > 0 };
              }

              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat}</span>
                      {trend && (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: trend.up ? 'var(--rose)' : 'var(--emerald)', flexShrink: 0 }}>
                          {trend.up ? '▲' : '▼'} {Math.abs(trend.change).toFixed(0)}%
                        </span>
                      )}
                      {isOver && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--rose)', flexShrink: 0 }}>Over</span>}
                      {isWarn && !isOver && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#fb923c', flexShrink: 0 }}>Warning</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span className="mono" style={{ fontSize: 11, color: isOver ? 'var(--rose)' : 'var(--fg)', fontWeight: 600 }}>{fmt(spent)}</span>
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>/ {fmt(limit)}</span>
                      <button onClick={() => handleDelete(cat)} title="Remove" style={{ fontSize: 12, color: 'var(--dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--rose)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--dim)'}
                      >✕</button>
                    </div>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${progress}%`, background: fillColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
