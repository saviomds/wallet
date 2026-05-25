'use client';

import TransactionChart      from '../TransactionChart';
import CategoryChart         from '../CategoryChart';
import DailySpendingChart    from '../DailySpendingChart';
import MonthlyComparisonChart from '../MonthlyComparisonChart';

export default function AnalyticsPage({ ctx = {} }) {
  const {
    transactions, filteredTransactions, summary, overallSummary,
    searchQuery, setSearchQuery,
    startDate, setStartDate, endDate, setEndDate,
    currency, setCurrency, CURRENCIES,
    formatAmount, exportToCSV, creditScore, creditRating,
  } = ctx;
  const creditColor = creditRating?.color || 'var(--muted)';

  const savingsRate = overallSummary.income > 0
    ? ((overallSummary.income - overallSummary.expenses) / overallSummary.income * 100).toFixed(1)
    : 0;

  const avgExpense = (() => {
    const expTxs = filteredTransactions.filter(t => t.type === 'expense');
    return expTxs.length ? overallSummary.expenses / expTxs.length : 0;
  })();

  const METRICS = [
    { label: 'Savings Rate',         value: `${savingsRate}%`,                    color: savingsRate >= 20 ? 'var(--emerald)' : savingsRate >= 0 ? 'var(--yellow)' : 'var(--rose)' },
    { label: 'Avg Expense',          value: formatAmount(avgExpense),              color: 'var(--muted)' },
    { label: 'Credit Score',         value: String(creditScore),                   color: creditColor },
    { label: 'Income / Expense',     value: overallSummary.expenses > 0 ? `${(overallSummary.income / overallSummary.expenses).toFixed(2)}x` : '—', color: 'var(--blue)' },
  ];

  // Top categories for spending table
  const topCategories = (() => {
    const bycat = {};
    for (const tx of filteredTransactions.filter(t => t.type === 'expense')) {
      const c = tx.category || 'Uncategorized';
      bycat[c] = (bycat[c] || 0) + parseFloat(tx.amount);
    }
    return Object.entries(bycat).sort((a, b) => b[1] - a[1]).slice(0, 8);
  })();
  const maxSpend = topCategories[0]?.[1] || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 4 }}>Overview</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-.02em' }}>Analytics</h1>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" placeholder="Search…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ flex: '1 1 160px', minWidth: 0 }} />
        <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: 'auto', flex: '0 0 auto' }} />
        <input type="date" className="input" value={endDate}   onChange={e => setEndDate(e.target.value)}   style={{ width: 'auto', flex: '0 0 auto' }} />
        <select value={currency} onChange={e => setCurrency(e.target.value)} className="input" style={{ width: 'auto', flex: '0 0 auto', padding: '12px 14px', fontWeight: 700, fontSize: 12 }}>
          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={exportToCSV} className="btn btn-ghost" style={{ padding: '12px 16px', flex: '0 0 auto' }}>Export</button>
      </div>

      {/* Key metrics */}
      <div className="grid-4">
        {METRICS.map(m => (
          <div key={m.label} style={{ padding: '18px 20px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{m.label}</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 300, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Income vs Expenses + Category breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-h"><h3>Income vs Expenses</h3></div>
          <div className="card-b"><TransactionChart summary={summary} /></div>
        </div>
        <div className="card">
          <div className="card-h"><h3>By Category</h3></div>
          <div className="card-b"><CategoryChart transactions={filteredTransactions} /></div>
        </div>
      </div>

      {/* Daily spending */}
      <div className="card">
        <div className="card-h">
          <h3>Daily Spending</h3>
          <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase' }}>
            {startDate} → {endDate}
          </span>
        </div>
        <div className="card-b">
          <DailySpendingChart transactions={filteredTransactions} startDate={startDate} endDate={endDate} />
        </div>
      </div>

      {/* Monthly comparison (uses all transactions, not filtered) */}
      <div className="card">
        <div className="card-h">
          <h3>Monthly Comparison</h3>
          <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase' }}>Last 6 months</span>
        </div>
        <div className="card-b">
          <MonthlyComparisonChart transactions={transactions} />
        </div>
      </div>

      {/* Top categories table */}
      {topCategories.length > 0 && (
        <div className="card">
          <div className="card-h"><h3>Top Spending Categories</h3></div>
          <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {topCategories.map(([cat, amt]) => (
              <div key={cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{cat}</span>
                  <span className="mono" style={{ fontSize: 13, color: 'var(--rose)' }}>−{formatAmount(amt)}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(amt / maxSpend) * 100}%`, background: 'var(--rose)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
