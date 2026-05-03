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
    <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
        <h1 className="text-3xl font-bold dark:text-white">Budget Wallet</h1>
        <div className="flex flex-wrap justify-center items-center gap-3">
          <ThemeToggle />
          <button onClick={() => supabase.auth.signOut()} className="text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-3 py-1 rounded transition-colors">
            Sign Out
          </button>
        </div>
      </div>

      {/* Control Panel: Filters, Search, and Export */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex flex-col md:flex-row gap-4 justify-between md:items-end text-black dark:text-white">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">From</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-1.5 rounded-md outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">To</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-1.5 rounded-md outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex flex-col flex-1 min-w-[150px]">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Search</label>
            <input type="text" placeholder="Category or description..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-1.5 rounded-md outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
          <select 
            value={currency} 
            onChange={(e) => setCurrency(e.target.value)} 
            className="text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white p-2 rounded-md outline-none focus:ring-2 focus:ring-blue-500 flex-1 md:flex-none cursor-pointer"
          >
            <option value="MUR">MUR (Rs)</option>
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="CHF">CHF (Fr)</option>
            <option value="GBP">GBP (£)</option>
            <option value="RWF">RWF (FRw)</option>
          </select>
          <button onClick={() => { setStartDate(''); setEndDate(''); setSearchQuery(''); }} className="text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-3 py-2 rounded transition-colors flex-1 md:flex-none">
            Clear Filters
          </button>
          <button onClick={exportToCSV} className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded font-medium transition-colors flex-1 md:flex-none">
            Export CSV
          </button>
        </div>
      </div>
      
      {/* Section 2: Dashboard (Balances) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow text-center border-t-4 border-blue-500">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Balance</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatAmount(summary.balance)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow text-center border-t-4 border-green-500">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Income</h3>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">+{formatAmount(summary.income)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow text-center border-t-4 border-red-500">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Expenses</h3>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">-{formatAmount(summary.expenses)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow text-center border-t-4 border-purple-500">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Top Expense</h3>
          {summary.biggestCategory ? (
            <>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 truncate" title={summary.biggestCategory}>{summary.biggestCategory}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">-{formatAmount(summary.biggestCategoryAmount)}</p>
            </>
          ) : (
            <p className="text-2xl font-bold text-gray-400 dark:text-gray-500">-</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Section 1: Add Transaction Form & Chart */}
        <div className="space-y-8">
          <AddTransactionForm 
            onAdded={fetchTransactions} 
            editingTransaction={editingTransaction} 
            onCancelEdit={() => setEditingTransaction(null)} 
          />
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-black dark:text-white">
            <h2 className="text-lg font-bold mb-4 border-b dark:border-gray-700 pb-2">Overview</h2>
            <TransactionChart summary={summary} />
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-black dark:text-white">
            <h2 className="text-lg font-bold mb-4 border-b dark:border-gray-700 pb-2">Spending by Category</h2>
            <CategoryChart transactions={filteredTransactions} />
          </div>

          <BudgetLimits transactions={filteredTransactions} currency={currency} exchangeRate={exchangeRates[currency] || 1} initialBudgets={settings.category_budgets} />

          <SavingsGoal currentBalance={summary.balance} currency={currency} exchangeRate={exchangeRates[currency] || 1} initialGoal={settings.savings_goal} />
        </div>

        {/* Section 3: Transaction List */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-black dark:text-white">
          <h2 className="text-lg font-bold mb-4 border-b dark:border-gray-700 pb-2">Recent Transactions</h2>
          {loading ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">Loading transactions...</p>
          ) : filteredTransactions.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No transactions found for this period.</p>
          ) : (
            <ul className="space-y-4">
              {paginatedTransactions.map((tx) => (
                <li key={tx.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-3 rounded">
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-semibold text-gray-800 dark:text-gray-100">{tx.category}</p>
                      <span className="text-[10px] text-gray-400 bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">{getLocalDateString(new Date(tx.created_at))}</span>
                    </div>
                    {tx.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tx.description}</p>}
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className={`font-bold ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatAmount(parseFloat(tx.amount))}
                    </div>
                    <button onClick={() => {
                      setEditingTransaction(tx);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }} className="text-blue-500 hover:text-blue-700 font-bold ml-2" title="Edit">
                      ✎
                    </button>
                    <button onClick={() => handleDelete(tx.id)} className="text-red-500 hover:text-red-700 font-bold" title="Delete">
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t dark:border-gray-700">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-800 dark:text-white px-3 py-1.5 rounded transition-colors font-medium"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-800 dark:text-white px-3 py-1.5 rounded transition-colors font-medium"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}