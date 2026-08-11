'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setError('Username must be 3-20 characters: letters, numbers, underscores only.');
      setLoading(false);
      return;
    }

    // Best-effort check so people get quick feedback, though the real
    // guarantee happens at confirmation time via the database.
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle();

    if (existing) {
      setError('That username is already taken.');
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: cleanUsername },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setConfirmSent(true);
  };

  if (confirmSent) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <h1>Check your email</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '10px' }}>
            We sent a confirmation link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
            Click it to activate your account, then come back and log in.
          </p>
          <div className="auth-switch">
            <a href="/login">Go to login</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>Create your account</h1>
        <form onSubmit={handleSignup}>
          <label>Gmail address</label>
          <input
            type="email"
            placeholder="you@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Username</label>
          <input
            type="text"
            placeholder="yourusername"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
        <div className="auth-switch">
          Already have an account? <a href="/login">Log in</a>
        </div>
      </div>
    </div>
  );
      }
