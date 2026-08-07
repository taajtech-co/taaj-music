'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
      <Link href="/" className="logo">
        <span className="wave-mark">
          <span></span><span></span><span></span><span></span>
        </span>
        TAAJ MUSIC
      </Link>

      {!session && (
        <div className="header-right">
          <Link href="/login" className="btn btn-outline">Log in</Link>
          <Link href="/signup" className="btn btn-primary">Sign up</Link>
        </div>
      )}
    </header>
  );
          }
