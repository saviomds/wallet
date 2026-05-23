'use client';

import { useState, useEffect } from 'react';

const DIRECT = [
  { id: 'dashboard', label: 'Home',   icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { id: 'ledger',    label: 'Ledger', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg> },
  { id: 'add',       label: 'Add',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg> },
  { id: 'pay',       label: 'Pay',    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg> },
];

const MORE_ITEMS = [
  { id: 'recurring', label: 'Recurring',      sub: 'Repeating transactions', icon: '↺' },
  { id: 'shared',    label: 'Shared Wallets', sub: 'Collaborate with others', icon: '👥' },
  { id: 'budgets',   label: 'Budgets',        sub: 'Category limits',        icon: '📊' },
  { id: 'savings',   label: 'Savings',        sub: 'Goal & progress',        icon: '🎯' },
  { id: 'analytics', label: 'Analytics',      sub: 'Charts & insights',      icon: '📈' },
  { id: 'settings',  label: 'Settings',       sub: 'Preferences & account',  icon: '⚙️' },
];

export default function MobileNav({ currentPage, onNavigate }) {
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [moreOpen]);

  const go = (id) => {
    setMoreOpen(false);
    onNavigate(id);
  };

  const isMoreActive = MORE_ITEMS.some(i => i.id === currentPage);

  return (
    <>
      <nav className="mobile-nav">
        {DIRECT.map(({ id, label, icon }) => (
          <button key={id} className={`mnav${currentPage === id ? ' active' : ''}`} onClick={() => go(id)}>
            {icon}
            {label}
          </button>
        ))}

        {/* More button */}
        <button className={`mnav${isMoreActive || moreOpen ? ' active' : ''}`} onClick={() => setMoreOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
          </svg>
          More
        </button>
      </nav>

      {/* More sheet */}
      {moreOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setMoreOpen(false)}
        >
          {/* Backdrop */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(6px)' }} />

          {/* Sheet */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative', width: '100%',
              background: '#101828', border: '1px solid var(--line-2)',
              borderBottom: 'none', borderRadius: '24px 24px 0 0',
              padding: '20px 20px 36px', animation: 'fadeIn .2s ease both',
            }}
          >
            <div style={{ width: 36, height: 4, background: 'var(--line-2)', borderRadius: 999, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <span className="eyebrow">More</span>
              <button onClick={() => setMoreOpen(false)} style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '.1em', textTransform: 'uppercase' }}>Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {MORE_ITEMS.map(({ id, label, sub, icon }) => (
                <button
                  key={id}
                  onClick={() => go(id)}
                  style={{
                    background: currentPage === id ? 'var(--accent-soft)' : 'rgba(255,255,255,.03)',
                    border: `1px solid ${currentPage === id ? 'rgba(21,93,252,.35)' : 'var(--line)'}`,
                    borderRadius: 14, padding: '14px 14px', textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, color: currentPage === id ? 'var(--accent)' : 'var(--fg)' }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
