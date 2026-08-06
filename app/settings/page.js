'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Navbar from '../../components/Navbar';

export default function SettingsPage() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    setTheme(document.documentElement.getAttribute('data-theme') || 'dark');

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
      if (!data.session) {
        window.location.href = '/login';
      } else {
        supabase
          .from('profiles')
          .select('username, is_admin')
          .eq('id', data.session.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setUsername(profile.username);
              setIsAdmin(profile.is_admin);
            }
          });
      }
    });
  }, []);

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

  if (checking) return null;

  return (
    <>
      <Navbar />
      <div className="content-area">
        <h1 className="section-title">Settings</h1>

        <div className="card" style={{ cursor: 'default', marginBottom: '16px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            ACCOUNT
          </div>
          <div style={{ fontWeight: 600 }}>@{username}</div>
        </div>

        <div
          className="card"
          style={{ cursor: 'pointer', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          onClick={toggleTheme}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              APPEARANCE
            </div>
            <div style={{ fontWeight: 600 }}>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</div>
          </div>
          <i className={theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'} style={{ fontSize: '18px' }}></i>
        </div>

        <a href="/upload" className="card" style={{ display: 'block', marginBottom: '16px' }}>
          <div style={{ fontWeight: 600 }}><i className="fas fa-upload" style={{ marginRight: '10px', color: 'var(--text-muted)' }}></i>Upload a song</div>
        </a>

        <a href="/my-uploads" className="card" style={{ display: 'block', marginBottom: '16px' }}>
          <div style={{ fontWeight: 600 }}><i className="fas fa-record-vinyl" style={{ marginRight: '10px', color: 'var(--text-muted)' }}></i>My Uploads</div>
        </a>

        {isAdmin && (
          <a href="/admin" className="card" style={{ display: 'block', marginBottom: '16px' }}>
            <div style={{ fontWeight: 600 }}><i className="fas fa-shield-halved" style={{ marginRight: '10px', color: 'var(--text-muted)' }}></i>Admin review</div>
          </a>
        )}

        <button
          className="btn btn-outline"
          onClick={handleLogout}
          style={{ width: '100%', padding: '12px', marginTop: '10px' }}
        >
          Log out
        </button>
      </div>
    </>
  );
}
