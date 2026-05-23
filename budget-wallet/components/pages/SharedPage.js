'use client';

import { useState } from 'react';

function UsersIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted)' }}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}

const FEATURES = [
  { icon: '👥', title: 'Invite Members',       desc: 'Add people by email and set their role (viewer or editor).' },
  { icon: '🔄', title: 'Shared Ledger',        desc: 'All members see and add transactions to a shared pool.' },
  { icon: '⚖️', title: 'Split Expenses',       desc: 'Automatically split bills between members.' },
  { icon: '📊', title: 'Activity Feed',         desc: 'See who added what and when in real time.' },
  { icon: '🔔', title: 'Smart Notifications',   desc: 'Get alerts when limits are hit or large transactions post.' },
  { icon: '🔒', title: 'Role-Based Access',     desc: 'Owners, editors, and viewers — full permission control.' },
];

export default function SharedPage({ ctx }) {
  const [email, setEmail] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 680 }}>

      {/* Header */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 4 }}>Collaboration</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-.02em' }}>Shared Wallets</h1>
      </div>

      {/* Hero empty state */}
      <div style={{ padding: '48px 32px', textAlign: 'center', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><UsersIcon /></div>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>Coming Soon</h2>
        <p style={{ margin: '0 0 24px', color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, maxWidth: 380, marginInline: 'auto' }}>
          Shared wallets let you collaborate on finances with family, a partner, or a team — all with role-based access and a live activity feed.
        </p>

        {/* Early access form */}
        <div style={{ display: 'flex', gap: 10, maxWidth: 400, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
          <input
            className="input"
            placeholder="your@email.com"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ flex: '1 1 200px' }}
          />
          <button
            className="btn btn-primary"
            onClick={() => { if (email) { setEmail(''); alert('You\'re on the list!'); } }}
            style={{ flex: '0 0 auto' }}
          >
            Join Waitlist
          </button>
        </div>
      </div>

      {/* Feature grid */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 14 }}>What's coming</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ padding: '18px 16px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14 }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Roadmap note */}
      <div style={{ padding: '14px 16px', background: 'rgba(21,93,252,.07)', border: '1px solid rgba(21,93,252,.22)', borderRadius: 12, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--accent)' }}>Roadmap:</strong> Shared wallets require a backend update to support multi-user tables, invite tokens, and role enforcement. This is tracked as a priority feature on the B1Overs roadmap.
      </div>
    </div>
  );
}
