'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function SettingsPage() {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    setTheme(document.documentElement.getAttribute('data-theme') || 'dark');

    supabase.auth.getSession().then(({ data }) => {
      setChecking(false);
      if (!data.session) {
        window.location.href = '/login';
        return;
      }
      setEmail(data.session.user.email);
      supabase
        .from('profiles')
        .select('username, display_name, is_admin')
        .eq('id', data.session.user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile) {
            setUsername(profile.username);
            setDisplayName(profile.display_name);
            setIsAdmin(profile.is_admin);
          }
        });
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
      <div className="settings-topbar">
        <Link href="/" className="settings-back"><i className="fas fa-arrow-left"></i></Link>
        <div className="settings-topbar-title">Settings</div>
        <div style={{ width: '32px' }}></div>
      </div>

      <div className="settings-list">
        <Link href={`/profile/${username}`} className="settings-row">
          <div className="settings-row-icon"><i className="fas fa-user"></i></div>
          <div>
            <div className="settings-row-title">Account</div>
            <div className="settings-row-sub">{displayName || `@${username}`} · {email}</div>
          </div>
        </Link>

        <button className="settings-row" onClick={toggleTheme}>
          <div className="settings-row-icon">
            <i className={theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun'}></i>
          </div>
          <div>
            <div className="settings-row-title">Appearance</div>
            <div className="settings-row-sub">{theme === 'dark' ? 'Dark mode' : 'Light mode'} · tap to switch</div>
          </div>
        </button>

        <Link href="/upload" className="settings-row">
          <div className="settings-row-icon"><i className="fas fa-circle-plus"></i></div>
          <div>
            <div className="settings-row-title">Upload a song</div>
            <div className="settings-row-sub">Submit a track for review</div>
          </div>
        </Link>

        <Link href="/my-uploads" className="settings-row">
          <div className="settings-row-icon"><i className="fas fa-record-vinyl"></i></div>
          <div>
            <div className="settings-row-title">My Uploads</div>
            <div className="settings-row-sub">Status &amp; deletion requests, lyrics</div>
          </div>
        </Link>

        {isAdmin && (
          <Link href="/admin" className="settings-row">
            <div className="settings-row-icon"><i className="fas fa-shield-halved"></i></div>
            <div>
              <div className="settings-row-title">Admin review</div>
              <div className="settings-row-sub">Approve uploads &amp; deletions</div>
            </div>
          </Link>
        )}

        <div className="settings-row" style={{ cursor: 'default' }}>
          <div className="settings-row-icon"><i className="fas fa-circle-info"></i></div>
          <div>
            <div className="settings-row-title">About</div>
            <div className="settings-row-sub">Taaj Music · v1.0</div>
          </div>
        </div>
      </div>

      <div className="logout-pill-wrap">
        <button className="logout-pill" onClick={handleLogout}>Log out</button>
      </div>
    </>
  );
                       }
