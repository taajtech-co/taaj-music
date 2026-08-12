'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Navbar() {
  const [session, setSession] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setUnreadCount(0);
      return;
    }
    loadUnreadCount();
  }, [session]);

  const loadUnreadCount = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('last_seen_new_songs')
      .eq('id', session.user.id)
      .single();

    const lastSeen = profile?.last_seen_new_songs || '1970-01-01';

    const { count } = await supabase
      .from('inbox_posts')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', lastSeen);

    setUnreadCount(count || 0);
  };

  return (
    <header>
      <Link href="/" className="logo">
        <span className="wave-mark">
          <span></span><span></span><span></span><span></span>
        </span>
        TAAJ MUSIC
      </Link>

      <div className="header-right">
        {session ? (
          <Link href="/inbox" className="icon-btn" style={{ position: 'relative' }}>
            <i className="fas fa-bell"></i>
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#E5484D',
                  color: 'white',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 700,
                  minWidth: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        ) : (
          <div className="header-right">
            <Link href="/login" className="btn btn-outline">Log in</Link>
            <Link href="/signup" className="btn btn-primary">Sign up</Link>
          </div>
        )}
      </div>
    </header>
  );
    }
