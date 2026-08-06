'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Navbar() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <header>
      <a href="/" className="logo">
        <span className="wave-mark">
          <span></span><span></span><span></span><span></span>
        </span>
        TAAJ MUSIC
      </a>

      {!session && (
        <div className="header-right">
          <a href="/login" className="btn btn-outline">Log in</a>
          <a href="/signup" className="btn btn-primary">Sign up</a>
        </div>
      )}
    </header>
  );
}
