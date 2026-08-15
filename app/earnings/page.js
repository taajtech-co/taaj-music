'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

const MIN_PAYOUT_CEDIS = 50;

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

export default function EarningsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [totalEarned, setTotalEarned] = useState(0);
  const [totalReserved, setTotalReserved] = useState(0);
  const [payouts, setPayouts] = useState([]);

  const [requesting, setRequesting] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const available = totalEarned - totalReserved;
  const canRequest = available >= MIN_PAYOUT_CEDIS;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.href = '/login';
        return;
      }
      setUserId(data.session.user.id);
      setChecking(false);
      loadData(data.session.user.id);
    });
  }, []);

  const loadData = async (uid) => {
    setLoading(true);

    const [tipsRes, payoutsRes] = await Promise.all([
      supabase.from('tips').select('amount_kobo').eq('artist_id', uid).eq('status', 'success'),
      supabase.from('payout_requests').select('id, amount_kobo, payout_method, status, created_at, paid_at').eq('artist_id', uid).order('created_at', { ascending: false }),
    ]);

    const earned = (tipsRes.data || []).reduce((sum, t) => sum + t.amount_kobo, 0) / 100;
    const reserved = (payoutsRes.data || [])
      .filter((p) => p.status === 'pending' || p.status === 'paid')
      .reduce((sum, p) => sum + p.amount_kobo, 0) / 100;

    setTotalEarned(earned);
    setTotalReserved(reserved);
    setPayouts(payoutsRes.data || []);
    setLoading(false);
  };

  const submitPayoutRequest = async () => {
    if (!canRequest) return;
    if (!payoutMethod.trim()) {
      setMessage('Enter your Mobile Money number or bank details.');
      return;
    }

    setSubmitting(true);
    setMessage('');

    const { error } = await supabase.from('payout_requests').insert({
      artist_id: userId,
      amount_kobo: Math.round(available * 100),
      payout_method: payoutMethod.trim(),
    });

    setSubmitting(false);

    if (error) {
      setMessage('Failed: ' + error.message);
    } else {
      setMessage('Payout requested! It will be sent manually within a few days.');
      setPayoutMethod('');
      setRequesting(false);
      loadData(userId);
    }
  };

  if (checking) return null;

  return (
    <>
      <div className="settings-topbar">
        <button className="settings-back" onClick={() => router.back()}><i className="fas fa-arrow-left"></i></button>
        <div className="settings-topbar-title">Earnings</div>
        <div style={{ width: '32px' }}></div>
      </div>

      <div className="content-area">
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
        ) : (
          <>
            <div className="card" style={{ cursor: 'default', marginBottom: '16px', background: 'rgba(47,209,197,0.1)', borderColor: 'var(--accent-2)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>AVAILABLE TO WITHDRAW</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-2)' }}>GH₵{available.toFixed(2)}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Total earned: GH₵{totalEarned.toFixed(2)} · Minimum withdrawal: GH₵{MIN_PAYOUT_CEDIS}
              </div>
            </div>

            {!canRequest && (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
                You need at least GH₵{MIN_PAYOUT_CEDIS} available before you can request a payout.
              </p>
            )}

            {canRequest && !requesting && (
              <button className="btn btn-primary" onClick={() => setRequesting(true)} style={{ marginBottom: '20px' }}>
                Request payout
              </button>
            )}

            {requesting && (
              <div className="upload-card" style={{ maxWidth: '360px', marginBottom: '20px' }}>
                <div style={{ fontWeight: 700, marginBottom: '10px' }}>Request GH₵{available.toFixed(2)}</div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Mobile Money number or bank details
                </label>
                <input
                  type="text"
                  placeholder="e.g. MTN MoMo 024xxxxxxx"
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                />
                {message && <div className="error-msg">{message}</div>}
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button className="btn btn-outline" onClick={() => setRequesting(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={submitPayoutRequest} disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Confirm request'}
                  </button>
                </div>
              </div>
            )}

            {!requesting && message && (
              <div className="error-msg" style={{ background: 'rgba(47,209,197,0.12)', color: 'var(--accent-2)', marginBottom: '20px' }}>
                {message}
              </div>
            )}

            <h2 className="section-title" style={{ fontSize: '16px', marginTop: '10px' }}>History</h2>
            {payouts.length === 0 && (
              <p style={{ color: 'var(--text-muted)' }}>No payout requests yet.</p>
            )}
            {payouts.map((p) => (
              <div key={p.id} className="card" style={{ cursor: 'default', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 600 }}>GH₵{(p.amount_kobo / 100).toFixed(2)}</div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      color: p.status === 'paid' ? 'var(--accent-2)' : p.status === 'rejected' ? '#E5484D' : 'var(--text-muted)',
                    }}
                  >
                    {p.status}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {p.payout_method} · {timeAgo(p.created_at)}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
