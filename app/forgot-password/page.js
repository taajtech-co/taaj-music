'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <h1>Check your email</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '10px' }}>
            If an account exists for <strong style={{ color: 'var(--text)' }}>{email}</strong>, a password reset link is on its way.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', marginTop: '14px' }}>
            Don&apos;t see it? Check your spam or junk folder.
          </p>
          <div className="auth-switch">
            <a href="/login">Back to login</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>Reset your password</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', marginTop: '-10px', marginBottom: '10px' }}>
          Enter the Gmail address on your account and we&apos;ll send you a reset link.
        </p>
        <form onSubmit={handleSubmit}>
          <label>Gmail address</label>
          <input
            type="email"
            placeholder="you@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
        <div className="auth-switch">
          <a href="/login">Back to login</a>
        </div>
      </div>
    </div>
  );
      }
