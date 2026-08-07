'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function BottomNav() {
  const pathname = usePathname();
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  const isActive = (path) => pathname === path;

  return (
    <nav className="bottom-nav">
      <Link href="/" className={isActive('/') ? 'active' : ''}>
        <i className="fas fa-house"></i>
        Home
      </Link>

      {session ? (
        <>
          <Link href="/upload" className={isActive('/upload') ? 'active' : ''}>
            <i className="fas fa-circle-plus"></i>
            Upload
          </Link>
          <Link href="/my-uploads" className={isActive('/my-uploads') ? 'active' : ''}>
            <i className="fas fa-record-vinyl"></i>
            Library
          </Link>
          <Link href="/settings" className={isActive('/settings') ? 'active' : ''}>
            <i className="fas fa-gear"></i>
            Settings
          </Link>
        </>
      ) : (
        <Link href="/login" className={isActive('/login') ? 'active' : ''}>
          <i className="fas fa-user"></i>
          Log in
        </Link>
      )}
    </nav>
  );
    }
