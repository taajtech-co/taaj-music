'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const hash = window.location.hash?.replace('#', '');
    const hashParams = new URLSearchParams(hash);
    const err = hashParams.get('error');
    const errDesc = hashParams.get('error_description');

    if (err) {
      setLinkError(errDesc ? decodeURIComponent(errDesc.replace(/\+/g, ' ')) : 'This link is invalid or has expired.');
      setReady(true);
      return;
    }

    // Supabase's client library picks up the recovery token from the URL
    // automatically; give it a moment, then confirm a session exists.
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setLinkError('This link is invalid or has expired. Please request a new one.');
      }
      setReady(true);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
  };

  if (!ready) return null;

  if (done) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <i className="fas fa-circle-check" style={{ fontSize: '40px', color: 'var(--accent-2)' }}></i>
          </div>
          <h1>Password updated</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '10px' }}>
            You can now log in with your new password.
          </p>
          <a
            href="/login"
            className="btn btn-primary"
            style={{ display: 'block', textAlign: 'center', marginTop: '24px', padding: '12px', borderRadius: '999px' }}
          >
            Log in
          </a>
        </div>
      </div>
    );
  }

  if (linkError) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <i className="fas fa-circle-exclamation" style={{ fontSize: '40px', color: '#E5484D' }}></i>
          </div>
          <h1>Link expired</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '10px' }}>
            {linkError}
          </p>
          <a
            href="/forgot-password"
            className="btn btn-primary"
            style={{ display: 'block', textAlign: 'center', marginTop: '24px', padding: '12px', borderRadius: '999px' }}
          >
            Request a new link
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>Set a new password</h1>
        <form onSubmit={handleSubmit}>
          <label>New password</label>
          <input
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          <label>Confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            required
          />

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
  }
