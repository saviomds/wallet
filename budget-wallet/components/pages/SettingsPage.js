'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import ThemeToggle from '../ThemeToggle';

// ─── 2FA section ─────────────────────────────────────────────────────────────

function TwoFactorSection() {
  const [status, setStatus]         = useState('loading'); // loading | disabled | pending | enabled
  const [factorId, setFactorId]     = useState(null);
  const [qrUri, setQrUri]           = useState('');
  const [secret, setSecret]         = useState('');
  const [code, setCode]             = useState('');
  const [challengeId, setChallengeId] = useState(null);
  const [busy, setBusy]             = useState(false);

  useEffect(() => { checkStatus(); }, []);

  const checkStatus = async () => {
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.find(f => f.status === 'verified');
      if (verified) { setFactorId(verified.id); setStatus('enabled'); }
      else          { setStatus('disabled'); }
    } catch { setStatus('disabled'); }
  };

  const handleEnable = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'B1Overs Wallet' });
      if (error) throw error;
      setFactorId(data.id);
      setQrUri(data.totp.qr_code);
      setSecret(data.totp.secret);
      // Immediately create a challenge so we can verify
      const { data: chData, error: chErr } = await supabase.auth.mfa.challenge({ factorId: data.id });
      if (chErr) throw chErr;
      setChallengeId(chData.id);
      setStatus('pending');
    } catch (err) {
      toast.error(err.message || 'Could not start 2FA enrollment');
    } finally { setBusy(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code || code.length !== 6) { toast.error('Enter the 6-digit code from your authenticator app'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
      if (error) throw error;
      setStatus('enabled');
      setQrUri('');
      setSecret('');
      setCode('');
      toast.success('2FA enabled successfully');
    } catch (err) {
      toast.error(err.message || 'Invalid code — try again');
    } finally { setBusy(false); }
  };

  const handleDisable = async () => {
    if (!confirm('Remove 2FA from your account?')) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setFactorId(null);
      setStatus('disabled');
      toast.info('2FA removed');
    } catch (err) {
      toast.error(err.message || 'Could not disable 2FA');
    } finally { setBusy(false); }
  };

  const handleCancel = async () => {
    // Unenroll the unverified factor
    if (factorId) {
      try { await supabase.auth.mfa.unenroll({ factorId }); } catch {}
    }
    setStatus('disabled');
    setQrUri('');
    setSecret('');
    setCode('');
    setFactorId(null);
    setChallengeId(null);
  };

  if (status === 'loading') {
    return <div style={{ padding: '14px 0', color: 'var(--muted)', fontSize: 13 }}>Checking 2FA status…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Status row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            Two-Factor Authentication
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase',
              padding: '2px 8px', borderRadius: 999,
              background: status === 'enabled' ? 'rgba(16,185,129,.12)' : 'rgba(255,255,255,.05)',
              color: status === 'enabled' ? 'var(--emerald)' : 'var(--muted)',
              border: `1px solid ${status === 'enabled' ? 'rgba(16,185,129,.3)' : 'var(--line)'}`,
            }}>
              {status === 'enabled' ? 'Enabled' : status === 'pending' ? 'Pending' : 'Disabled'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {status === 'enabled' ? 'Your account is protected with an authenticator app.' : 'Add an extra layer of security using a TOTP authenticator app.'}
          </div>
        </div>
        {status === 'disabled' && (
          <button onClick={handleEnable} disabled={busy} className="btn btn-ghost" style={{ padding: '8px 16px', flexShrink: 0 }}>
            {busy ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Enable'}
          </button>
        )}
        {status === 'enabled' && (
          <button onClick={handleDisable} disabled={busy} className="btn btn-danger" style={{ padding: '8px 16px', flexShrink: 0 }}>
            {busy ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Disable'}
          </button>
        )}
      </div>

      {/* QR enrollment flow */}
      {status === 'pending' && (
        <div style={{ padding: '20px', background: 'rgba(255,255,255,.02)', border: '1px solid var(--line)', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="eyebrow">Step 1 — Scan QR Code</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
            {/* QR code rendered via Google Charts API (no dependency needed) */}
            {qrUri && (
              <img
                src={`https://chart.googleapis.com/chart?cht=qr&chs=160x160&chl=${encodeURIComponent(qrUri)}&chld=M|0`}
                alt="2FA QR code"
                width={160}
                height={160}
                style={{ borderRadius: 12, background: '#fff', padding: 8, flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 10 }}>
                Open <strong style={{ color: 'var(--fg)' }}>Google Authenticator</strong>, <strong style={{ color: 'var(--fg)' }}>Authy</strong>, or any TOTP app and scan this QR code.
              </div>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Manual entry key</div>
              <div className="mono" style={{ fontSize: 12, letterSpacing: '.15em', color: 'var(--accent)', wordBreak: 'break-all', padding: '8px 10px', background: 'rgba(21,93,252,.07)', border: '1px solid rgba(21,93,252,.22)', borderRadius: 8 }}>
                {secret}
              </div>
            </div>
          </div>

          <div className="eyebrow">Step 2 — Verify code</div>
          <form onSubmit={handleVerify} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <input
              className="input mono"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ flex: '1 1 140px', fontSize: 20, letterSpacing: '.3em', textAlign: 'center' }}
              autoComplete="one-time-code"
              autoFocus
            />
            <button type="submit" disabled={busy || code.length !== 6} className="btn btn-primary" style={{ padding: '12px 20px', opacity: code.length !== 6 ? .5 : 1 }}>
              {busy ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Verify & Activate'}
            </button>
            <button type="button" onClick={handleCancel} className="btn btn-ghost" style={{ padding: '12px 16px' }}>Cancel</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function SettingsPage({ ctx }) {
  const { session, currency, setCurrency, CURRENCIES, exportToCSV, creditScore, creditRating, overallSummary, formatAmount } = ctx;

  const email    = session?.user?.email ?? '—';
  const userName = email.split('@')[0];
  const joined   = session?.user?.created_at
    ? new Date(session.user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 600 }}>

      {/* Header */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 4 }}>Account</div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-.02em' }}>Settings</h1>
      </div>

      {/* Profile */}
      <div className="card">
        <div className="card-h"><h3>Profile</h3></div>
        <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'var(--accent-soft)', border: '1px solid rgba(21,93,252,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
            }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, textTransform: 'capitalize', marginBottom: 2 }}>{userName}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
            </div>
          </div>
          <div style={{ height: 1, background: 'var(--line)' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { label: 'Member since',   value: joined },
              { label: 'Auth provider',  value: session?.user?.app_metadata?.provider ?? 'email' },
              { label: 'Net Balance',    value: formatAmount(overallSummary.balance),  mono: true, color: 'var(--accent)' },
              { label: 'Credit Score',   value: String(creditScore), mono: true, color: creditRating.color },
            ].map(row => (
              <div key={row.label}>
                <div className="eyebrow" style={{ marginBottom: 3 }}>{row.label}</div>
                <div className={row.mono ? 'mono' : ''} style={{ fontSize: row.mono ? 18 : 13, fontWeight: row.mono ? 300 : 600, textTransform: 'capitalize', color: row.color }}>
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="card">
        <div className="card-h"><h3>Preferences</h3></div>
        <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div className="label">Display currency</div>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="input" style={{ padding: '12px 14px' }}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
              Amounts are converted from MUR using live exchange rates.
            </div>
          </div>
          <div style={{ height: 1, background: 'var(--line)' }} />
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Appearance</div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Security / 2FA */}
      <div className="card">
        <div className="card-h"><h3>Security</h3></div>
        <div className="card-b">
          <TwoFactorSection />
        </div>
      </div>

      {/* Data */}
      <div className="card">
        <div className="card-h"><h3>Data Management</h3></div>
        <div className="card-b">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Export transactions</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Download all transactions as CSV</div>
            </div>
            <button onClick={exportToCSV} className="btn btn-ghost" style={{ padding: '8px 16px', flexShrink: 0 }}>Export CSV</button>
          </div>
        </div>
      </div>

      {/* Session */}
      <div className="card">
        <div className="card-h"><h3>Session</h3></div>
        <div className="card-b">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Sign out</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>You will be returned to the login screen</div>
            </div>
            <button onClick={() => supabase.auth.signOut()} className="btn btn-danger" style={{ padding: '8px 16px', flexShrink: 0 }}>Sign Out</button>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--dim)', letterSpacing: '.15em', textTransform: 'uppercase', fontWeight: 700 }}>
        B1Overs Wallet · Institutional Grade Finance
      </div>
    </div>
  );
}
