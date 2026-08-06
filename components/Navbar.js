'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Navbar() {
  const [session, setSession] = useState(null);
  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(current);

    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));

    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      listener.subscription.unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
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

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('taaj-theme', next);
    setTheme(next);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <header>
      <a href="/" className="logo">
        <span className="wave-mark">
          <span></span><span></span><span></span><span></span>
        </span>
        TAAJ MUSIC
      </a>

      <div className="header-right">
        {!session && (
          <>
            <a href="/login" className="btn btn-outline">Log in</a>
            <a href="/signup" className="btn btn-primary">Sign up</a>
          </>
        )}

        <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
          <i className={theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'}></i>
        </button>

        {session && (
          <div className="settings-wrap" ref={panelRef}>
            <button className="avatar-btn" onClick={() => setOpen(!open)}>
              {username ? username.charAt(0).toUpperCase() : 'U'}
            </button>

            {open && (
              <div className="settings-panel">
                <div className="settings-header">@{username || 'account'}</div>

                <a href="/upload" className="settings-item">
                  <i className="fas fa-upload"></i> Upload
                </a>
                <a href="/my-uploads" className="settings-item">
                  <i className="fas fa-list-music"></i> My Uploads
                </a>
                {isAdmin && (
                  <a href="/admin" className="settings-item">
                    <i className="fas fa-shield-halved"></i> Admin
                  </a>
                )}

                <div className="settings-divider"></div>

                <button className="settings-item" onClick={handleLogout}>
                  <i className="fas fa-arrow-right-from-bracket"></i> Log out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
      }
