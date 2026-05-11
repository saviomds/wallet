'use client';

import { useMemo, useState } from 'react';

const getLocalDateString = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const SORTS = {
  newest:  { label: 'Newest',  fn: (a, b) => new Date(b.created_at) - new Date(a.created_at) },
  oldest:  { label: 'Oldest',  fn: (a, b) => new Date(a.created_at) - new Date(b.created_at) },
  highest: { label: 'Highest', fn: (a, b) => parseFloat(b.amount) - parseFloat(a.amount) },
  lowest:  { label: 'Lowest',  fn: (a, b) => parseFloat(a.amount) - parseFloat(b.amount) },
};

function bucketFor(dateStr) {
  const tx = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const txDay = new Date(tx);
  txDay.setHours(0, 0, 0, 0);
  const diff = Math.round((today - txDay) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'This Week';
  if (diff < 30) return 'This Month';
  return 'Earlier';
}

function Highlighted({ text, query }) {
  if (!text) return null;
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function Ledger({
  transactions,
  loading,
  searchQuery,
  formatAmount,
  editingTransaction,
  onEdit,
  onCancelEdit,
  onDelete,
}) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortKey, setSortKey] = useState('newest');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const filtered = useMemo(() => {
    let list = transactions;
    if (typeFilter !== 'all') list = list.filter((t) => t.type === typeFilter);
    return [...list].sort(SORTS[sortKey].fn);
  }, [transactions, typeFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const groups = useMemo(() => {
    const out = [];
    let current = null;
    for (const tx of paginated) {
      const b = bucketFor(tx.created_at);
      if (!current || current.bucket !== b) {
        current = { bucket: b, items: [] };
        out.push(current);
      }
      current.items.push(tx);
    }
    return out;
  }, [paginated]);

  return (
    <div className="card" style={{ position: 'sticky', top: 20 }}>

      {/* Header */}
      <div className="card-h" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <h3>Master Ledger</h3>
          <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase' }}>
            {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {/* Filters row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', flexWrap: 'wrap' }}>
          {/* Type filter */}
          <div className="seg">
            {[
              { v: 'all',     label: 'All'     },
              { v: 'income',  label: 'Income'  },
              { v: 'expense', label: 'Expense' },
            ].map((opt) => (
              <button
                key={opt.v}
                className={typeFilter === opt.v ? 'on' : ''}
                onClick={() => { setTypeFilter(opt.v); setPage(1); }}
                style={
                  typeFilter === opt.v && opt.v === 'income'  ? { background: 'var(--emerald)', color: '#000' } :
                  typeFilter === opt.v && opt.v === 'expense' ? { background: 'var(--rose)',    color: '#fff' } :
                  {}
                }
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="input"
            style={{ width: 'auto', padding: '7px 12px', fontSize: 11, fontWeight: 700, marginLeft: 'auto', flexShrink: 0 }}
          >
            {Object.entries(SORTS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Body */}
      <div>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '.2em', textTransform: 'uppercase', fontWeight: 700 }}>
              Loading…
            </div>
          </div>
        ) : paginated.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--dim)', fontSize: 12 }}>
            {searchQuery || typeFilter !== 'all' ? 'No matches found.' : 'No transactions yet.'}
          </div>
        ) : (
          groups.map((g, gi) => (
            <div key={g.bucket}>
              <div className="date-sep" style={gi === 0 ? { borderTop: 0 } : {}}>
                {g.bucket}
              </div>
              {g.items.map((tx) => {
                const isEditing = editingTransaction?.id === tx.id;
                return (
                  <div
                    key={tx.id}
                    className="ledger-row"
                    style={isEditing ? {
                      background: 'var(--accent-soft)',
                      borderLeftColor: 'var(--accent)',
                    } : {}}
                  >
                    {/* Avatar */}
                    <div className={`avatar ${tx.type}`}>
                      {tx.category?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Highlighted text={tx.category} query={searchQuery} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getLocalDateString(new Date(tx.created_at))}
                        {tx.description ? (
                          <> · <Highlighted text={tx.description} query={searchQuery} /></>
                        ) : null}
                      </div>
                    </div>

                    {/* Amount + actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <span
                        className="mono"
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: tx.type === 'income' ? 'var(--emerald)' : 'var(--fg)',
                        }}
                      >
                        {tx.type === 'income' ? '+' : '−'}{formatAmount(parseFloat(tx.amount))}
                      </span>

                      <div style={{ display: 'flex', gap: 4 }}>
                        {isEditing ? (
                          <button
                            onClick={onCancelEdit}
                            title="Cancel edit"
                            style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rose)', borderRadius: 6, transition: 'background .15s' }}
                          >
                            <CloseIcon />
                          </button>
                        ) : (
                          <button
                            onClick={() => onEdit(tx)}
                            title="Edit"
                            style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', borderRadius: 6, transition: 'color .15s' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                          >
                            <EditIcon />
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(tx)}
                          title="Delete"
                          style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', borderRadius: 6, transition: 'color .15s' }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--rose)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <button
            disabled={safePage === 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn btn-ghost"
            style={{ padding: '6px 14px', fontSize: 10, opacity: safePage === 1 ? .3 : 1 }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '.15em', textTransform: 'uppercase', fontWeight: 700 }}>
            {safePage} / {totalPages}
          </span>
          <button
            disabled={safePage === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn btn-ghost"
            style={{ padding: '6px 14px', fontSize: 10, opacity: safePage === totalPages ? .3 : 1 }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
