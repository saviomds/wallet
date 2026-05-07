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
import PayAndInvoice from '../components/PayAndInvoice';
import { supabase } from '../lib/supabase';

const getLocalDateString = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function Dashboard() {
  const [session, setSession] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState({ savings_goal: 0, category_budgets: {} });
  const [loading, setLoading] = useState(true);
  
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
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/MUR')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rates) setExchangeRates(data.rates);
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

  const filteredTransactions = transactions.filter((tx) => {
    if (!tx.created_at) return false;
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
  const overallSummary = getSummary(transactions);

  const calculateCreditScore = (stats) => {
    let score = 650; // Base start score
    if (stats.balance > 1000) score += 30;
    if (stats.balance > 5000) score += 40;
    if (stats.balance > 10000) score += 50;
    
    if (stats.income > 0) {
        const savingRatio = (stats.income - stats.expenses) / stats.income;
        if (savingRatio > 0.5) score += 60;
        else if (savingRatio > 0.2) score += 30;
        else if (savingRatio < 0) score -= 50;
    }
    return Math.min(Math.max(Math.floor(score), 300), 850);
  };

  const creditScore = calculateCreditScore(overallSummary);

  const getCreditScoreRating = (score) => {
    if (score >= 750) return { label: 'EXCELLENT', color: 'text-emerald-500' };
    if (score >= 700) return { label: 'GOOD', color: 'text-emerald-500' };
    if (score >= 650) return { label: 'FAIR', color: 'text-yellow-500' };
    if (score >= 600) return { label: 'POOR', color: 'text-orange-500' };
    return { label: 'BAD', color: 'text-rose-500' };
  };

  const rating = getCreditScoreRating(creditScore);

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

  const handleDelete = (id) => {
    setTransactionToDelete(id);
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(transactionToDelete);
      fetchTransactions();
    } catch (error) {
      alert('Action failed.');
    } finally {
      setTransactionToDelete(null);
      setIsDeleting(false);
    }
  };

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      alert('No transactions to export for the selected period.');
      return;
    }

    const headers = ['Date', 'Category', 'Description', 'Type', 'Amount'];
    
    const escapeCSV = (str) => {
      if (str === null || str === undefined) return '';
      const string = String(str);
      if (string.includes(',') || string.includes('"') || string.includes('\n')) {
        return `"${string.replace(/"/g, '""')}"`;
      }
      return string;
    };

    const rows = filteredTransactions.map(tx => 
      [
        getLocalDateString(new Date(tx.created_at)),
        escapeCSV(tx.category),
        escapeCSV(tx.description),
        escapeCSV(tx.type),
        tx.amount
      ].join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `budget_statement_${getLocalDateString(new Date())}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchTransactions();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchTransactions();
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!session) return <main className="min-h-screen flex flex-col justify-center p-4"><Auth /></main>;

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-28 sm:pb-8">
      
      {/* 1. TOP UTILITY BAR (Bank Style) */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 bg-card/50 border border-card-border p-3 rounded-2xl px-6 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-bold uppercase tracking-tighter text-gray-400">Secure Server: Online</span>
        </div>
        <div className="flex items-center gap-6">
          <a 
            href="https://beoneofus.work" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-accent hover:underline uppercase tracking-widest"
          >
            Connect Account
          </a>
          <ThemeToggle />
        </div>
      </div>

      {/* 2. MAIN BRANDING */}
      <div className="flex flex-col items-center justify-center py-6">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground text-center uppercase">
          <span className="text-accent">B1Overs</span>Wallet
        </h1>
        <p className="text-gray-500 text-[10px] tracking-[0.3em] font-bold uppercase mt-2">Institutional Grade B1Overs Finance</p>
      </div>

      {/* 3. QUICK ACTIONS & PARTNER LINK */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a 
          href="https://beoneofus.work" 
          target="_blank" 
          className="glass-card p-6 flex items-center justify-between group hover:border-accent transition-all"
        >
          <div>
            <h4 className="text-xs font-bold uppercase text-accent mb-1">Global Network</h4>
            <p className="text-sm text-gray-400">Join beoneofus.work</p>
          </div>
          <div className="p-3 rounded-full bg-accent/10 text-accent group-hover:bg-accent group-hover:text-black transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
          </div>
        </a>

        <div className="glass-card p-6 flex items-center justify-between border-l-4 border-l-purple-500">
          <div>
            <h4 className="text-xs font-bold uppercase text-gray-500 mb-1">Credit Score</h4>
            <p className="text-xl font-light">{creditScore} <span className={`text-[10px] font-bold ${rating.color}`}>{rating.label}</span></p>
          </div>
          <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
        </div>

        <button onClick={() => supabase.auth.signOut()} className="glass-card p-6 flex items-center justify-between hover:bg-rose-500/5 group transition-all">
          <div>
            <h4 className="text-xs font-bold uppercase text-gray-500 mb-1">Session</h4>
            <p className="text-sm text-rose-500 group-hover:font-bold">Terminate Connection</p>
          </div>
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        </button>
      </div>

      {/* 4. TOTALS SECTION */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Net Liquidity', val: summary.balance, color: 'accent' },
          { label: 'Total Inflow', val: summary.income, color: 'emerald-500', prefix: '+' },
          { label: 'Total Outflow', val: summary.expenses, color: 'rose-500', prefix: '-' },
          { label: 'Top Liability', val: summary.biggestCategoryAmount, color: 'purple-500', sub: summary.biggestCategory }
        ].map((item, i) => (
          <div key={i} className="glass-card p-6 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full bg-${item.color}`}></div>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-2">{item.label}</h3>
            <p className={`text-xl md:text-2xl font-light ${item.prefix === '-' ? 'text-rose-500' : item.prefix === '+' ? 'text-emerald-500' : ''}`}>
              {item.prefix}{formatAmount(item.val)}
            </p>
            {item.sub && <p className="text-[9px] text-gray-400 uppercase mt-1 truncate">{item.sub}</p>}
          </div>
        ))}
      </div>

      {/* 5. SEARCH & FILTER TOOLBAR */}
      <div className="glass-card p-4 flex flex-col lg:flex-row gap-4 items-center bg-card/80 backdrop-blur-xl border-accent/20">
        <div className="flex flex-col sm:flex-row flex-1 gap-2 w-full">
          <input 
            type="text" 
            placeholder="Search ledger..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="minimal-input flex-1 p-3 text-xs uppercase font-bold tracking-widest bg-black/20"
          />
          <select 
            value={currency} 
            onChange={(e) => setCurrency(e.target.value)} 
            className="minimal-input p-3 text-xs font-bold bg-black/20 w-full sm:w-auto"
          >
            {['MUR', 'INR', 'USD', 'EUR', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <div className="flex gap-2 w-full sm:w-auto">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="minimal-input p-3 text-[10px] flex-1" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="minimal-input p-3 text-[10px] flex-1" />
          </div>
          <button onClick={exportToCSV} className="bg-accent text-black font-black text-[10px] px-6 py-3 rounded-lg uppercase hover:scale-105 transition-transform w-full sm:w-auto">
            Export Statement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* SIDEBAR */}
        <div className="lg:col-span-5 space-y-8">
          <div id="add-transaction" className="p-[1px] bg-gradient-to-br from-accent to-transparent rounded-3xl scroll-mt-8">
            <div className="bg-background rounded-[23px]">
              <AddTransactionForm 
                onAdded={fetchTransactions} 
                editingTransaction={editingTransaction} 
                onCancelEdit={() => setEditingTransaction(null)} 
              />
            </div>
          </div>
          
          <div className="glass-card p-6">
            <h2 className="text-[10px] font-black tracking-widest uppercase text-gray-500 mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-accent rounded-full"></span> Spending Analytics
            </h2>
            <TransactionChart summary={summary} />
            <div className="mt-8">
              <CategoryChart transactions={filteredTransactions} />
            </div>
          </div>

          <BudgetLimits transactions={filteredTransactions} currency={currency} exchangeRate={exchangeRates[currency] || 1} initialBudgets={settings.category_budgets} />
          <SavingsGoal currentBalance={summary.balance} currency={currency} exchangeRate={exchangeRates[currency] || 1} initialGoal={settings.savings_goal} />
          <div id="pay-invoice" className="scroll-mt-8">
            <PayAndInvoice currency={currency} onAdded={fetchTransactions} />
          </div>
        </div>

        {/* LEDGER */}
        <div id="ledger" className="lg:col-span-7 scroll-mt-8">
          <div className="glass-card p-0 overflow-hidden border-accent/10">
            <div className="p-6 border-b border-card-border bg-card/30">
              <h2 className="text-[10px] font-black tracking-widest uppercase text-gray-400">Master Ledger</h2>
            </div>
            
            <div className="divide-y divide-card-border">
              {loading ? (
                <div className="p-20 text-center animate-pulse text-[10px] font-bold uppercase tracking-widest">Decrypting Data...</div>
              ) : paginatedTransactions.length === 0 ? (
                <div className="p-20 text-center text-[10px] font-bold uppercase tracking-widest text-gray-600">No records in vault.</div>
              ) : (
                paginatedTransactions.map((tx) => (
                    <div key={tx.id} className={`group flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 p-5 transition-colors ${editingTransaction?.id === tx.id ? 'bg-accent/10 border-l-4 border-accent' : 'hover:bg-accent/[0.02] border-l-4 border-transparent'}`}>
                      <div className="flex gap-4 items-center w-full sm:w-auto">
                        <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-xs ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'} ${editingTransaction?.id === tx.id ? 'ring-2 ring-accent ring-offset-2 ring-offset-background' : ''}`}>
                        {tx.category?.charAt(0)}
                      </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm uppercase tracking-tight text-foreground truncate">{tx.category}</p>
                          <p className="text-[10px] text-gray-500 font-medium uppercase truncate">{getLocalDateString(new Date(tx.created_at))} • {tx.description || 'No memo'}</p>
                      </div>
                    </div>
                      <div className="w-full sm:w-auto flex justify-between sm:justify-end items-center gap-4 border-t border-card-border sm:border-0 pt-4 sm:pt-0 mt-1 sm:mt-0">
                      <div className={`font-mono text-lg ${tx.type === 'income' ? 'text-emerald-500' : 'text-foreground'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatAmount(parseFloat(tx.amount))}
                      </div>
                      <div className={`flex gap-1 transition-opacity ${editingTransaction?.id === tx.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        {editingTransaction?.id === tx.id ? (
                          <button onClick={() => setEditingTransaction(null)} className="p-2 text-accent hover:text-rose-500" title="Cancel Edit"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                        ) : (
                          <button onClick={() => { setEditingTransaction(tx); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 hover:text-accent" title="Edit Transaction"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                        )}
                        <button onClick={() => handleDelete(tx.id)} className="p-2 hover:text-rose-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {totalPages > 1 && (
              <div className="p-4 bg-card/20 flex justify-between items-center border-t border-card-border">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="text-[9px] font-black uppercase tracking-tighter disabled:opacity-20 hover:text-accent">Prev Page</button>
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Entry {currentPage} of {totalPages}</span>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="text-[9px] font-black uppercase tracking-tighter disabled:opacity-20 hover:text-accent">Next Page</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {transactionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card bg-card p-8 max-w-sm w-full space-y-6 animate-in fade-in zoom-in duration-200 border border-rose-500/20 shadow-2xl shadow-rose-500/10">
            <h3 className="text-sm font-black uppercase tracking-widest text-rose-500">Confirm Reversal</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Are you sure you want to permanently delete this transaction from the vault? This action cannot be undone.
            </p>
            <div className="flex gap-4 pt-4">
              <button disabled={isDeleting} onClick={() => setTransactionToDelete(null)} className="flex-1 bg-card border border-card-border hover:border-accent text-foreground px-4 py-3 rounded-full font-bold uppercase tracking-widest text-[10px] transition-all disabled:opacity-50">
                Cancel
              </button>
              <button disabled={isDeleting} onClick={confirmDelete} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white px-4 py-3 rounded-full font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-rose-500/20 flex justify-center items-center gap-2 disabled:opacity-50">
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-card-border pt-3 pb-6 px-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <div className="flex justify-around items-center">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-center text-gray-500 hover:text-accent transition-colors">
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            <span className="text-[9px] font-bold uppercase tracking-widest">Home</span>
          </button>
          <button onClick={() => document.getElementById('add-transaction')?.scrollIntoView({ behavior: 'smooth' })} className="flex flex-col items-center text-gray-500 hover:text-accent transition-colors">
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            <span className="text-[9px] font-bold uppercase tracking-widest">Add</span>
          </button>
          <button onClick={() => document.getElementById('ledger')?.scrollIntoView({ behavior: 'smooth' })} className="flex flex-col items-center text-gray-500 hover:text-accent transition-colors">
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            <span className="text-[9px] font-bold uppercase tracking-widest">Ledger</span>
          </button>
          <button onClick={() => document.getElementById('pay-invoice')?.scrollIntoView({ behavior: 'smooth' })} className="flex flex-col items-center text-gray-500 hover:text-accent transition-colors">
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            <span className="text-[9px] font-bold uppercase tracking-widest">Pay</span>
          </button>
        </div>
      </div>
    </main>
  );
}