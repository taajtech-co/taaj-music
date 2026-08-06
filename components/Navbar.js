'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Navbar() {
  const [session, setSession] = useState(null);
  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setUsername('');
      setIsAdmin(false);
      return;
    }
    supabase
      .from('profiles')
      .select('username, is_admin')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setUsername(data.username);
          setIsAdmin(data.is_admin);
        }
      });
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <header>
      <a href="/" className="logo">
        <i className="fas fa-music"></i>
        <span>TAAJ MUSIC</span>
      </a>
      <div className="nav-actions">
        {session ? (
          <>
            <a href="/upload" className="btn btn-outline">Upload</a>
            <a href="/my-uploads" className="btn btn-outline">My Uploads</a>
            {isAdmin && (
              <a href="/admin" className="btn btn-outline">Admin</a>
            )}
            <span style={{ fontSize: '14px', color: 'var(--gray)' }}>
              {username && `@${username}`}
            </span>
            <button className="btn btn-primary" onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <a href="/login" className="btn btn-outline">Log in</a>
            <a href="/signup" className="btn btn-primary">Sign up</a>
          </>
        )}
      </div>
    </header>
  );
  }
