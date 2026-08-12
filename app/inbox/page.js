'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function InboxPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        window.location.href = '/login';
        return;
      }
      setChecking(false);
      await loadPosts();

      // Mark everything as read now that they've opened the inbox
      await supabase
        .from('profiles')
        .update({ last_seen_new_songs: new Date().toISOString() })
        .eq('id', data.session.user.id);
    });
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inbox_posts')
      .select('id, type, title, body, song_id, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error) setPosts(data);
    setLoading(false);
  };

  if (checking) return null;

  return (
    <>
      <div className="settings-topbar">
        <button className="settings-back" onClick={() => router.back()}><i className="fas fa-arrow-left"></i></button>
        <div className="settings-topbar-title">Inbox</div>
        <div style={{ width: '32px' }}></div>
      </div>

      <div className="content-area">
        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}

        {!loading && posts.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>Nothing here yet.</p>
        )}

        {posts.map((post) => (
          <div key={post.id} className="card" style={{ cursor: 'default', marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: post.type === 'new_song' ? 'var(--accent-2)' : 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  flexShrink: 0,
                  fontSize: '14px',
                }}
              >
                <i className={post.type === 'new_song' ? 'fas fa-music' : 'fas fa-bullhorn'}></i>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>
                  {post.type === 'new_song' ? `New song: ${post.title}` : post.title}
                </div>
                {post.body && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>
                    {post.body}
                  </div>
                )}
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                  {timeAgo(post.created_at)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
