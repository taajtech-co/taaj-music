'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
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
      <a href="/" className={isActive('/') ? 'active' : ''}>
        <i className="fas fa-house"></i>
        Home
      </a>

      {session ? (
        <>
          <a href="/upload" className={isActive('/upload') ? 'active' : ''}>
            <i className="fas fa-circle-plus"></i>
            Upload
          </a>
          <a href="/my-uploads" className={isActive('/my-uploads') ? 'active' : ''}>
            <i className="fas fa-record-vinyl"></i>
            Library
          </a>
          <a href="/settings" className={isActive('/settings') ? 'active' : ''}>
            <i className="fas fa-gear"></i>
            Settings
          </a>
        </>
      ) : (
        <a href="/login" className={isActive('/login') ? 'active' : ''}>
          <i className="fas fa-user"></i>
          Log in
        </a>
      )}
    </nav>
  );
            }
