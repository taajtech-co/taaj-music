'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  const isActive = (path) => pathname === path;

  const go = (path) => (e) => {
    e.preventDefault();
    router.push(path);
  };

  if (!ready) return null;

  return (
    <nav className="bottom-nav">
      <a href="/" onClick={go('/')} className={isActive('/') ? 'active' : ''}>
        <i className="fas fa-house"></i>
        Home
      </a>

      {session ? (
        <>
          <a href="/upload" onClick={go('/upload')} className={isActive('/upload') ? 'active' : ''}>
            <i className="fas fa-circle-plus"></i>
            Upload
          </a>
          <a href="/library" onClick={go('/library')} className={isActive('/library') ? 'active' : ''}>
            <i className="fas fa-record-vinyl"></i>
            Library
          </a>
          <a href="/settings" onClick={go('/settings')} className={isActive('/settings') ? 'active' : ''}>
            <i className="fas fa-gear"></i>
            Settings
          </a>
        </>
      ) : (
        <a href="/login" onClick={go('/login')} className={isActive('/login') ? 'active' : ''}>
          <i className="fas fa-user"></i>
          Log in
        </a>
      )}
    </nav>
  );
    }
