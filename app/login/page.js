'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let email = identifier.trim();

    if (!email.includes('@')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', email.toLowerCase())
        .maybeSingle();

      if (!profile) {
        setError('No account found with that username.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/resolve-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id }),
      });
      const json = await res.json();
      if (!json.email) {
        setError('Could not find account. Try logging in with your email instead.');
        setLoading(false);
        return;
      }
      email = json.email;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    window.location.href = '/';
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>Log in to Taaj Music</h1>
        <form onSubmit={handleLogin}>
          <label>Username or Gmail address</label>
          <input
            type="text"
            placeholder="yourusername or you@gmail.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <div className="auth-switch" style={{ marginTop: '10px' }}>
          <a href="/forgot-password">Forgot password?</a>
        </div>
        <div className="auth-switch">
          Don&apos;t have an account? <a href="/signup">Sign up</a>
        </div>
      </div>
    </div>
  );
  }
