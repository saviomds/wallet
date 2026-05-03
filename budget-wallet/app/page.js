'use client';

import { useEffect, useState } from 'react';
import { getTransactions, getSummary, deleteTransaction, getUserSettings } from '../lib/transactions';
import AddTransactionForm from '../components/AddTransactionForm';
import Auth from '../components/Auth';
import ThemeToggle from '../components/ThemeToggle';
import TransactionChart from '../components/TransactionChart';
import CategoryChart from '../components/CategoryChart';
import SavingsGoal from '../components/SavingsGoal';
import BudgetLimits from '../components/BudgetLimits';
import { supabase } from '../lib/supabase';

// Helper to grab standard YYYY-MM-DD from user's local timezone
const getLocalDateString = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState({ savings_goal: 0, category_budgets: {} });
  const [loading, setLoading] = useState(true);
  
  // New Advanced Filtering States
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return getLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return getLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const [currency, setCurrency] = useState('MUR');
  const [exchangeRates, setExchangeRates] = useState({});

  const ITEMS_PER_PAGE = 5;

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, searchQuery]);

  // Fetch live exchange rates on mount
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/MUR')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rates) {
          setExchangeRates(data.rates);
        }
      })
      .catch((err) => console.error('Error fetching rates:', err));
  }, []);

  const formatAmount = (amount) => {
    const rate = exchangeRates[currency] || 1;
    const converted = amount * rate;
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency,
    }).format(converted);
  };

  // Multi-layered filtering logic
  const filteredTransactions = transactions.filter((tx) => {
    if (!tx.created_at) return false;
    
    // Convert database UTC to user's local date string before comparing
    const txDate = getLocalDateString(new Date(tx.created_at));
    
    if (startDate && txDate < startDate) return false;
    if (endDate && txDate > endDate) return false;
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      return (tx.category?.toLowerCase().includes(lowerQuery) || tx.description?.toLowerCase().includes(lowerQuery));
    }
    return true;
  });

  const summary = getSummary(filteredTransactions);

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const fetchTransactions = async () => {
    try {
      const [txData, settingsData] = await Promise.all([
        getTransactions(),
        getUserSettings()
      ]);
      setTransactions(txData || []);
      if (settingsData) setSettings(settingsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      await deleteTransaction(id);
      fetchTransactions(); // Refresh the list and balances
    } catch (error) {
      alert('Failed to delete transaction. Please try again.');
    }
  };

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) return alert('No data to export!');
    
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount'];
    const rows = filteredTransactions.map(tx => [
      getLocalDateString(new Date(tx.created_at)),
      tx.type,
      `"${tx.category || ''}"`,
      `"${tx.description || ''}"`,
      tx.amount
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'budget_export.csv';
    link.click();
  };

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchTransactions();
    });

    // Listen for auth changes (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchTransactions();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return (
      <main className="min-h-screen flex flex-col justify-center p-4">
        <Auth />
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 md:space-y-10">
      {/* Header: Centered, Symmetrical, Futuristic */}
      <div className="flex flex-col items-center justify-center mt-8 mb-12 gap-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground text-center">
          Budget <span className="text-accent drop-shadow-sm">Wallet</span>
        </h1>
        <div className="flex flex-wrap justify-center items-center gap-4">
          <ThemeToggle />
          <button onClick={() => supabase.auth.signOut()} className="bg-card border border-card-border hover:border-accent text-foreground px-6 py-2 rounded-full font-bold uppercase tracking-widest text-[10px] transition-all duration-300 shadow-sm">
            Sign Out
          </button>
        </div>
      </div>

      {/* Control Panel: Filters, Search, and Export */}
      <div className="glass-card p-6 flex flex-col lg:flex-row gap-6 justify-between items-center w-full">
        <div className="flex flex-wrap justify-center lg:justify-start items-center gap-4 w-full lg:w-auto">
          <div className="flex flex-col items-center lg:items-start w-full sm:w-auto">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">From</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="minimal-input p-2 w-full sm:w-auto text-sm text-center lg:text-left" />
          </div>
          <div className="flex flex-col items-center lg:items-start w-full sm:w-auto">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">To</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="minimal-input p-2 w-full sm:w-auto text-sm text-center lg:text-left" />
          </div>
          <div className="flex flex-col items-center lg:items-start w-full sm:w-auto flex-1 min-w-[150px]">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Search</label>
            <input type="text" placeholder="Category or keyword..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="minimal-input p-2 w-full sm:w-auto text-sm text-center lg:text-left" />
          </div>
        </div>
        <div className="flex flex-wrap justify-center lg:justify-end gap-3 w-full lg:w-auto items-end">
          <select 
            value={currency} 
            onChange={(e) => setCurrency(e.target.value)} 
            className="minimal-input p-2 text-sm cursor-pointer w-full sm:w-auto text-center lg:text-left appearance-none"
          >
            <option value="MUR">MUR (Rs)</option>
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="CHF">CHF (Fr)</option>
            <option value="GBP">GBP (£)</option>
            <option value="RWF">RWF (FRw)</option>
          </select>
          <button onClick={() => { setStartDate(''); setEndDate(''); setSearchQuery(''); }} className="bg-card border border-card-border hover:border-accent text-foreground px-6 py-2 rounded-full font-bold uppercase tracking-widest text-[10px] transition-all w-full sm:w-auto">
            Clear
          </button>
          <button onClick={exportToCSV} className="bg-accent hover:bg-accent-hover text-white dark:text-black px-6 py-2 rounded-full font-bold uppercase tracking-widest text-[10px] transition-all shadow-md shadow-accent/20 w-full sm:w-auto">
            Export CSV
          </button>
        </div>
      </div>
      
      {/* Section 2: Dashboard (Balances) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="glass-card p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-accent opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Total Balance</h3>
          <p className="text-2xl md:text-3xl font-light text-foreground">{formatAmount(summary.balance)}</p>
        </div>
        <div className="glass-card p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Total Income</h3>
          <p className="text-2xl md:text-3xl font-light text-emerald-500">+{formatAmount(summary.income)}</p>
        </div>
        <div className="glass-card p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-rose-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Total Expenses</h3>
          <p className="text-2xl md:text-3xl font-light text-rose-500">-{formatAmount(summary.expenses)}</p>
        </div>
        <div className="glass-card p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-purple-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Top Expense</h3>
          {summary.biggestCategory ? (
            <>
              <p className="text-xl md:text-2xl font-light text-purple-500 truncate w-full" title={summary.biggestCategory}>{summary.biggestCategory}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">-{formatAmount(summary.biggestCategoryAmount)}</p>
            </>
          ) : (
            <p className="text-2xl md:text-3xl font-light text-gray-500">-</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Left Column: Form & Analytics */}
        <div className="lg:col-span-5 space-y-6 md:space-y-8">
          <AddTransactionForm 
            onAdded={fetchTransactions} 
            editingTransaction={editingTransaction} 
            onCancelEdit={() => setEditingTransaction(null)} 
          />
          
          <div className="glass-card p-6">
            <h2 className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-6 border-b border-card-border pb-3">Overview</h2>
            <TransactionChart summary={summary} />
          </div>

          <div className="glass-card p-6">
            <h2 className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-6 border-b border-card-border pb-3">Spending by Category</h2>
            <CategoryChart transactions={filteredTransactions} />
          </div>

          <BudgetLimits transactions={filteredTransactions} currency={currency} exchangeRate={exchangeRates[currency] || 1} initialBudgets={settings.category_budgets} />

          <SavingsGoal currentBalance={summary.balance} currency={currency} exchangeRate={exchangeRates[currency] || 1} initialGoal={settings.savings_goal} />
        </div>

        {/* Right Column: Transaction List */}
        <div className="lg:col-span-7">
          <div className="glass-card p-6 h-full min-h-[500px]">
            <h2 className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-6 border-b border-card-border pb-3">Recent Transactions</h2>
            {loading ? (
              <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold text-center py-10">Loading entries...</p>
            ) : filteredTransactions.length === 0 ? (
              <p className="text-gray-500 text-[10px] uppercase tracking-widest font-bold text-center py-10">No entries found for this period.</p>
            ) : (
              <ul className="space-y-2">
                {paginatedTransactions.map((tx) => (
                  <li key={tx.id} className="group flex justify-between items-center p-4 border border-transparent border-b-card-border hover:border-card-border hover:bg-card-bg/30 rounded-xl transition-all duration-300">
                    <div>
                      <div className="flex items-center space-x-3 mb-1">
                        <p className="font-bold text-sm text-foreground">{tx.category}</p>
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest bg-card border border-card-border px-2 py-0.5 rounded-full">{getLocalDateString(new Date(tx.created_at))}</span>
                      </div>
                      {tx.description && <p className="text-xs text-gray-400">{tx.description}</p>}
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className={`font-medium text-lg tracking-tight ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatAmount(parseFloat(tx.amount))}
                      </div>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => {
                          setEditingTransaction(tx);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} className="text-gray-400 hover:text-accent p-2 transition-colors" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button onClick={() => handleDelete(tx.id)} className="text-gray-400 hover:text-rose-500 p-2 transition-colors" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6 pt-6 border-t border-card-border">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="bg-card border border-card-border hover:border-accent disabled:hover:border-card-border disabled:opacity-30 text-foreground px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  Previous
                </button>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="bg-card border border-card-border hover:border-accent disabled:hover:border-card-border disabled:opacity-30 text-foreground px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}