'use client';

import { useState } from 'react';
import { updateUserSettings } from '../../lib/transactions';
import { toast } from '../../lib/toast';

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'];

function nextDateFor(period) {
  const d = new Date();
  if (period === 'daily')   d.setDate(d.getDate() + 1);
  if (period === 'weekly')  d.setDate(d.getDate() + 7);
  if (period === 'monthly') d.setMonth(d.getMonth() + 1);
  if (period === 'yearly')  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>;
}

export default function RecurringPage({ ctx }) {
  const { settings, setSettings, formatAmount, onAdded } = ctx;
  const rules = settings.recurring_rules || [];

  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ name: '', amount: '', type: 'expense', category: '', period: 'monthly' });
  const [saving, setSaving]         = useState(false);

  const persistRules = async (next) => {
    try {
      await updateUserSettings({ recurring_rules: next });
      setSettings(s => ({ ...s, recurring_rules: next }));
    } catch {
      toast.error('Could not save');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !form.amount || !form.category) return;
    setSaving(true);
    const rule = {
      id: crypto.randomUUID(),
      name: form.name,
      amount: parseFloat(form.amount),
      type: form.type,
      category: form.category,
      period: form.period,
      nextDate: nextDateFor(form.period),
      active: true,
    };
    const next = [...rules, rule];
    await persistRules(next);
    toast.success(`Recurring "${rule.name}" created`);
    setForm({ name: '', amount: '', type: 'expense', category: '', period: 'monthly' });
    setShowForm(false);
    setSaving(false);
  };

  const toggleActive = async (id) => {
    const next = rules.map(r => r.id === id ? { ...r, active: !r.active } : r);
    await persistRules(next);
  };

  const deleteRule = async (id) => {
    const next = rules.filter(r => r.id !== id);
    await persistRules(next);
    toast.info('Recurring rule removed');
  };

  const PERIOD_COLORS = { daily: 'var(--blue)', weekly: 'var(--purple)', monthly: 'var(--accent)', yearly: 'var(--emerald)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Money</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-.02em' }}>Recurring</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(s => !s)} style={{ padding: '10px 16px' }}>
          <PlusIcon /> {showForm ? 'Cancel' : 'New Rule'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card fadein">
          <div className="card-h"><h3>New Recurring Rule</h3></div>
          <form onSubmit={handleAdd} className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div className="label">Name</div>
              <input className="input" placeholder="e.g. Netflix Subscription" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className="label">Amount</div>
                <input className="input mono" type="number" step="0.01" min="0" required placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <div className="label">Category</div>
                <input className="input" placeholder="e.g. Entertainment" required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className="label">Type</div>
                <div className="seg" style={{ width: '100%' }}>
                  {['expense', 'income'].map(t => (
                    <button key={t} type="button" className={form.type === t ? 'on' : ''} style={{ flex: 1,
                      ...(form.type === t && t === 'expense' ? { background: 'var(--rose)', color: '#fff' } : {}),
                      ...(form.type === t && t === 'income'  ? { background: 'var(--emerald)', color: '#000' } : {}),
                    }} onClick={() => setForm(f => ({ ...f, type: t }))}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="label">Period</div>
                <select className="input" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} style={{ padding: '11px 14px' }}>
                  {PERIODS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary btn-block" style={{ marginTop: 4 }}>
              {saving ? 'Saving…' : 'Create Rule'}
            </button>
          </form>
        </div>
      )}

      {/* Rules list */}
      {rules.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13, border: '1px dashed var(--line)', borderRadius: 18 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>↺</div>
          No recurring rules yet. Create one to automatically track regular transactions.
        </div>
      ) : (
        <div className="card">
          <div className="card-h">
            <h3>Active Rules</h3>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase' }}>
              {rules.filter(r => r.active).length} active
            </span>
          </div>
          <div>
            {rules.map((rule, i) => (
              <div key={rule.id} className="ledger-row" style={{ borderTop: i > 0 ? '1px solid var(--line)' : 'none', opacity: rule.active ? 1 : .45 }}>
                <div className={`avatar ${rule.type}`}>{rule.category?.charAt(0)?.toUpperCase() ?? '?'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {rule.name}
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, background: `${PERIOD_COLORS[rule.period]}20`, color: PERIOD_COLORS[rule.period] }}>
                      {rule.period}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                    {rule.category} · Next: {rule.nextDate}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: rule.type === 'income' ? 'var(--emerald)' : 'var(--rose)' }}>
                    {rule.type === 'income' ? '+' : '−'}{formatAmount(rule.amount)}
                  </span>
                  <button
                    onClick={() => toggleActive(rule.id)}
                    title={rule.active ? 'Pause' : 'Resume'}
                    style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: rule.active ? 'var(--emerald)' : 'var(--muted)', fontSize: 14 }}
                  >
                    {rule.active ? '⏸' : '▶'}
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    title="Delete"
                    style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14 }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--rose)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info note */}
      <div style={{ padding: '14px 16px', background: 'rgba(21,93,252,.07)', border: '1px solid rgba(21,93,252,.22)', borderRadius: 12, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--accent)' }}>How it works:</strong> Rules are stored in your account settings. Automatic posting is coming — for now, use rules as a reminder and post transactions manually from the Add page.
      </div>
    </div>
  );
}
