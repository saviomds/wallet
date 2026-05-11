'use client';

import Ledger from '../Ledger';

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}

export default function LedgerPage({ ctx }) {
  const {
    filteredTransactions, loading,
    searchQuery, setSearchQuery,
    startDate, setStartDate, endDate, setEndDate,
    currency, setCurrency, CURRENCIES,
    formatAmount, exportToCSV,
    editingTransaction, setEditingTransaction, onAdded, onDelete,
    navigate,
  } = ctx;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Money</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-.02em' }}>Master Ledger</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={currency} onChange={e => setCurrency(e.target.value)} className="input" style={{ width: 'auto', padding: '9px 14px', fontWeight: 700, fontSize: 12 }}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={exportToCSV} className="btn btn-ghost" style={{ padding: '9px 16px' }}>Export CSV</button>
          <button onClick={() => navigate('add')} className="btn btn-primary" style={{ padding: '9px 16px' }}>+ Add</button>
        </div>
      </div>

      {/* Search + dates */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--dim)', display: 'flex' }}>
            <SearchIcon />
          </span>
          <input className="input" placeholder="Search transactions…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: 40 }} />
        </div>
        <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: 'auto', flex: '0 0 auto' }} />
        <input type="date" className="input" value={endDate}   onChange={e => setEndDate(e.target.value)}   style={{ width: 'auto', flex: '0 0 auto' }} />
      </div>

      <Ledger
        transactions={filteredTransactions}
        loading={loading}
        searchQuery={searchQuery}
        formatAmount={formatAmount}
        editingTransaction={editingTransaction}
        onEdit={tx => { setEditingTransaction(tx); navigate('add'); }}
        onCancelEdit={() => setEditingTransaction(null)}
        onDelete={onDelete}
      />
    </div>
  );
}
