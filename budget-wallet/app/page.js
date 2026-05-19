'use client';

import { useEffect, useState, useRef } from 'react';
import { getTransactions, getSummary, deleteTransaction, getUserSettings, addTransaction, updateUserSettings } from '../lib/transactions';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import Auth from '../components/Auth';
import MobileNav from '../components/MobileNav';
import ToastContainer from '../components/Toast';

// ─── Pages ───────────────────────────────────────────────────────────────────
import DashboardPage  from '../components/pages/DashboardPage';
import AnalyticsPage  from '../components/pages/AnalyticsPage';
import AddPage        from '../components/pages/AddPage';
import LedgerPage     from '../components/pages/LedgerPage';
import PayPage        from '../components/pages/PayPage';
import RecurringPage  from '../components/pages/RecurringPage';
import SharedPage     from '../components/pages/SharedPage';
import BudgetsPage    from '../components/pages/BudgetsPage';
import SavingsPage    from '../components/pages/SavingsPage';
import SettingsPage   from '../components/pages/SettingsPage';

const CURRENCIES = ['MUR','RWF','INR','USD','EUR','GBP','JPY','AUD','CAD','CHF','CNY','ZAR','AED'];

// ─── Nav sections & icons ────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
      { id: 'analytics', label: 'Analytics',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg> },
    ],
  },
  {
    label: 'Money',
    items: [
      { id: 'add', label: 'Add Transaction',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg> },
      { id: 'ledger', label: 'Ledger',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg> },
      { id: 'pay', label: 'Pay & Invoice',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg> },
      { id: 'recurring', label: 'Recurring',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg> },
    ],
  },
  {
    label: 'Goals',
    items: [
      { id: 'budgets', label: 'Budget Limits',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> },
      { id: 'savings', label: 'Savings Goal',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
    ],
  },
  {
    label: 'Collaboration',
    items: [
      { id: 'shared', label: 'Shared Wallets',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'settings', label: 'Settings',
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
    ],
  },
];

const PAGE_MAP = {
  dashboard: DashboardPage,
  analytics: AnalyticsPage,
  add:       AddPage,
  ledger:    LedgerPage,
  pay:       PayPage,
  recurring: RecurringPage,
  shared:    SharedPage,
  budgets:   BudgetsPage,
  savings:   SavingsPage,
  settings:  SettingsPage,
};

const getLocalDateString = (date) =>
  `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

// ─── App Shell ───────────────────────────────────────────────────────────────

export default function App() {
  const [session, setSession]           = useState(null);
  const [currentPage, setCurrentPage]   = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings]         = useState({ savings_goal: 0, category_budgets: {}, recurring_rules: [] });
  const [loading, setLoading]           = useState(true);
  const [currency, setCurrency]         = useState('MUR');
  const [exchangeRates, setExchangeRates] = useState({});
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [startDate, setStartDate]       = useState(() => {
    const now = new Date();
    return getLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [endDate, setEndDate]           = useState(() => {
    const now = new Date();
    return getLocalDateString(new Date(now.getFullYear(), now.getMonth()+1, 0));
  });
  const pendingDeletes = useRef(new Map());
  const [hiddenIds, setHiddenIds]       = useState(new Set());

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/MUR')
      .then(r => r.json())
      .then(d => { if (d?.rates) setExchangeRates(d.rates); })
      .catch(() => {});
  }, []);

  const formatAmount = (amount) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount * (exchangeRates[currency] || 1));

  const visibleTransactions = transactions.filter(t => !hiddenIds.has(t.id));

  const filteredTransactions = visibleTransactions.filter((tx) => {
    if (!tx.created_at) return false;
    const d = getLocalDateString(new Date(tx.created_at));
    if (startDate && d < startDate) return false;
    if (endDate   && d > endDate)   return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return tx.category?.toLowerCase().includes(q) || tx.description?.toLowerCase().includes(q);
    }
    return true;
  });

  const summary        = getSummary(filteredTransactions);
  const overallSummary = getSummary(visibleTransactions);

  const creditScore = (() => {
    let s = 650;
    const { balance, income, expenses } = overallSummary;
    if (balance > 1000)  s += 30;
    if (balance > 5000)  s += 40;
    if (balance > 10000) s += 50;
    if (income > 0) {
      const r = (income - expenses) / income;
      if (r > 0.5) s += 60; else if (r > 0.2) s += 30; else if (r < 0) s -= 50;
    }
    return Math.min(Math.max(Math.floor(s), 300), 850);
  })();

  const creditRating = (() => {
    if (creditScore >= 750) return { label: 'Excellent', color: '#10b981' };
    if (creditScore >= 700) return { label: 'Good',      color: '#10b981' };
    if (creditScore >= 650) return { label: 'Fair',      color: '#fbbf24' };
    if (creditScore >= 600) return { label: 'Poor',      color: '#fb923c' };
    return                         { label: 'Bad',       color: '#fb7185' };
  })();

  const fetchTransactions = async () => {
    try {
      const [txData, settingsData] = await Promise.all([getTransactions(), getUserSettings()]);
      setTransactions(txData || []);
      if (settingsData) {
        setSettings(s => ({ ...s, ...settingsData }));
        await processRecurringRules(settingsData.recurring_rules || []);
      }
    } catch (err) {
      console.error('fetchTransactions failed:', err?.message ?? err?.code ?? err);
      toast.error('Could not load data');
    } finally {
      setLoading(false);
    }
  };

  const processRecurringRules = async (rules) => {
    if (!rules?.length) return;
    const today = new Date().toISOString().split('T')[0];
    const due = rules.filter(r => r.active && r.nextDate && r.nextDate <= today);
    if (!due.length) return;

    const nextDateFor = (period) => {
      const d = new Date();
      if (period === 'daily')   d.setDate(d.getDate() + 1);
      if (period === 'weekly')  d.setDate(d.getDate() + 7);
      if (period === 'monthly') d.setMonth(d.getMonth() + 1);
      if (period === 'yearly')  d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().split('T')[0];
    };

    let posted = 0;
    const updatedRules = rules.map(r => ({ ...r }));

    for (const rule of due) {
      try {
        await addTransaction({
          amount: rule.amount,
          type: rule.type,
          category: rule.category,
          description: `Recurring: ${rule.name}`,
        });
        posted++;
        const idx = updatedRules.findIndex(r => r.id === rule.id);
        if (idx >= 0) updatedRules[idx].nextDate = nextDateFor(rule.period);
      } catch (err) {
        console.error('Failed to post recurring rule:', rule.name, err);
      }
    }

    if (posted > 0) {
      await updateUserSettings({ recurring_rules: updatedRules });
      setSettings(s => ({ ...s, recurring_rules: updatedRules }));
      toast.success(`${posted} recurring transaction${posted > 1 ? 's' : ''} auto-posted`);
      // Reload transactions to show new entries
      const fresh = await getTransactions();
      setTransactions(fresh || []);
    }
  };

  const handleDelete = (tx) => {
    setHiddenIds(p => { const n = new Set(p); n.add(tx.id); return n; });
    const commit = setTimeout(async () => {
      pendingDeletes.current.delete(tx.id);
      try {
        await deleteTransaction(tx.id);
        setTransactions(p => p.filter(x => x.id !== tx.id));
      } catch {
        toast.error('Delete failed');
        setHiddenIds(p => { const n = new Set(p); n.delete(tx.id); return n; });
      }
    }, 5000);
    pendingDeletes.current.set(tx.id, commit);
    toast.show({
      message: `Deleted "${tx.category}"`, type: 'info', duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          const t = pendingDeletes.current.get(tx.id);
          if (t) clearTimeout(t);
          pendingDeletes.current.delete(tx.id);
          setHiddenIds(p => { const n = new Set(p); n.delete(tx.id); return n; });
          toast.success('Restored');
        },
      },
    });
  };

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) { toast.error('No transactions to export'); return; }
    const esc = (s) => { const v = String(s ?? ''); return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g,'""')}"` : v; };
    const rows = filteredTransactions.map(tx =>
      [getLocalDateString(new Date(tx.created_at)), esc(tx.category), esc(tx.description), tx.type, tx.amount].join(',')
    );
    const blob = new Blob([['Date,Category,Description,Type,Amount', ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `b1overs_${getLocalDateString(new Date())}.csv`;
    a.style.display = 'none';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success('Statement exported');
  };

  const navigate = (page) => setCurrentPage(page);

  const editTransaction = (tx) => {
    setEditingTransaction(tx);
    setCurrentPage('add');
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        if (session) fetchTransactions();
        else setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!session) return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 16 }}>
      <Auth />
      <ToastContainer />
    </main>
  );

  const ctx = {
    session,
    transactions: visibleTransactions,
    filteredTransactions,
    summary, overallSummary,
    settings, setSettings,
    loading,
    currency, setCurrency, CURRENCIES,
    exchangeRates, formatAmount,
    searchQuery, setSearchQuery,
    startDate, setStartDate,
    endDate, setEndDate,
    editingTransaction, setEditingTransaction,
    onAdded: fetchTransactions,
    onDelete: handleDelete,
    exportToCSV,
    navigate,
    editTransaction,
    creditScore, creditRating,
  };

  const CurrentPage = PAGE_MAP[currentPage] || DashboardPage;

  return (
    <div className="app">

      {/* ─── Sidebar ─── */}
      <aside className="sidebar">
        <div style={{ padding: '4px 12px 16px' }}>
          <div className="eyebrow" style={{ marginBottom: 2 }}>B1Overs</div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.1 }}>Wallet</div>
          <div className="pill" style={{ marginTop: 12 }}>
            <span className="dot" />
            Live
          </div>
        </div>

        {NAV_SECTIONS.map(({ label, items }) => (
          <div key={label}>
            <div className="nav-section">{label}</div>
            {items.map(({ id, label: itemLabel, icon }) => (
              <button
                key={id}
                className={`nav-item${currentPage === id ? ' active' : ''}`}
                onClick={() => navigate(id)}
              >
                {icon}
                {itemLabel}
              </button>
            ))}
          </div>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: 8 }}>
          <div style={{ padding: '10px 12px 14px' }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Credit Score</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 300 }}>{creditScore}</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: creditRating.color }}>
                {creditRating.label}
              </span>
            </div>
          </div>
          <button
            className="nav-item"
            style={{ color: 'var(--rose)' }}
            onClick={() => supabase.auth.signOut()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, flexShrink: 0 }}>
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ─── Page ─── */}
      <main className="main">
        <CurrentPage ctx={ctx} />
      </main>

      <MobileNav currentPage={currentPage} onNavigate={navigate} />
      <ToastContainer />
    </div>
  );
}
