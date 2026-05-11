'use client';

export default function DashboardPage({ ctx }) {
  const { summary, overallSummary, transactions, loading, formatAmount, navigate, creditScore, creditRating, session } = ctx;

  const recent = [...transactions]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6);

  const userName = session?.user?.email?.split('@')[0] ?? 'User';

  const TILES = [
    { label: 'Net Balance',    value: formatAmount(overallSummary.balance),              barColor: 'var(--accent)',   trendLabel: overallSummary.balance >= 0 ? '▲ In surplus' : '▼ In deficit', trendClass: overallSummary.balance >= 0 ? 'up' : 'down' },
    { label: 'Total Income',   value: formatAmount(overallSummary.income),               barColor: 'var(--emerald)',  trendLabel: `${transactions.filter(t=>t.type==='income').length} transactions`, trendClass: 'up' },
    { label: 'Total Expenses', value: formatAmount(overallSummary.expenses),             barColor: 'var(--rose)',     trendLabel: `${transactions.filter(t=>t.type==='expense').length} transactions`, trendClass: 'down' },
    { label: 'Top Category',   value: overallSummary.biggestCategory || '—',             barColor: 'var(--purple)',   trendLabel: overallSummary.biggestCategory ? formatAmount(overallSummary.biggestCategoryAmount) : 'No data', trendClass: 'neutral' },
  ];

  const QUICK_ACTIONS = [
    { label: 'Add Transaction', sub: 'Record income or expense', page: 'add',       color: 'var(--accent)',   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg> },
    { label: 'View Ledger',     sub: 'Browse all transactions',  page: 'ledger',    color: 'var(--blue)',     icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg> },
    { label: 'Pay & Invoice',   sub: 'Send a payment or invoice', page: 'pay',      color: 'var(--purple)',   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg> },
    { label: 'Savings Goal',    sub: 'Track your progress',       page: 'savings',  color: 'var(--emerald)',  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Welcome back</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', textTransform: 'capitalize' }}>
            {userName}
          </h1>
        </div>
        <div style={{ padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 12, textAlign: 'right' }}>
          <div className="eyebrow" style={{ marginBottom: 2 }}>Credit Score</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 300 }}>{creditScore}</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: creditRating.color }}>{creditRating.label}</span>
          </div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid-4">
        {TILES.map(tile => (
          <div key={tile.label} className="tile">
            <div className="bar" style={{ background: tile.barColor }} />
            <h4>{tile.label}</h4>
            <div className="v mono">{tile.value}</div>
            <div className={`trend ${tile.trendClass}`}>{tile.trendLabel}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Quick Actions</div>
        <div className="grid-4">
          {QUICK_ACTIONS.map(a => (
            <button
              key={a.page}
              onClick={() => navigate(a.page)}
              style={{
                background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16,
                padding: '18px 16px', textAlign: 'left', cursor: 'pointer', transition: 'border-color .15s, transform .15s',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'none'; }}
            >
              <span style={{ color: a.color }}>{a.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{a.label}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card">
        <div className="card-h">
          <h3>Recent Transactions</h3>
          <button
            onClick={() => navigate('ledger')}
            style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            View All
          </button>
        </div>
        <div>
          {loading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : recent.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No transactions yet.{' '}
              <button onClick={() => navigate('add')} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                Add your first one →
              </button>
            </div>
          ) : (
            recent.map(tx => (
              <div key={tx.id} className="ledger-row">
                <div className={`avatar ${tx.type}`}>{tx.category?.charAt(0)?.toUpperCase() ?? '?'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.category}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                    {new Date(tx.created_at).toLocaleDateString()} {tx.description ? `· ${tx.description}` : ''}
                  </div>
                </div>
                <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: tx.type === 'income' ? 'var(--emerald)' : 'var(--fg)', flexShrink: 0 }}>
                  {tx.type === 'income' ? '+' : '−'}{formatAmount(parseFloat(tx.amount))}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
