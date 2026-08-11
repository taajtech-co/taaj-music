'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import Navbar from '../../components/Navbar';
import { useSongPlayer } from '../../context/PlayerContext';

export default function SearchPage() {
  const [songs, setSongs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const { playQueue } = useSongPlayer();

  useEffect(() => {
    const loadData = async () => {
      const { data: songsData, error: songsError } = await supabase
        .from('songs')
        .select('id, title, artist, storage_path, cover_path, lyrics, timed_lyrics, created_at, profiles(username, avatar_path)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (!songsError) setSongs(songsData);

      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_path');

      if (!usersError) setUsers(usersData);

      setLoading(false);
    };
    loadData();
  }, []);

  const coverUrl = (song) => {
    if (!song.cover_path) return null;
    return supabase.storage.from('covers').getPublicUrl(song.cover_path).data.publicUrl;
  };

  const avatarUrl = (p) => {
    if (!p.avatar_path) return null;
    return supabase.storage.from('avatars').getPublicUrl(p.avatar_path).data.publicUrl;
  };

  const q = query.trim().toLowerCase();

  const filteredSongs = songs.filter((song) => {
    if (!q) return false;
    return song.title.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q);
  });

  const filteredUsers = users.filter((u) => {
    if (!q) return false;
    return u.username.toLowerCase().includes(q) || (u.display_name || '').toLowerCase().includes(q);
  });

  const playSongAt = (index) => {
    playQueue(filteredSongs, index);
  };

  return (
    <>
      <Navbar />

      <div className="search-wrap" style={{ marginTop: '20px' }}>
        <div className="search-input-box">
          <i className="fas fa-magnifying-glass"></i>
          <input
            type="text"
            placeholder="Search songs, artists, or users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="content-area">
        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}

        {!loading && q === '' && (
          <p style={{ color: 'var(--text-muted)' }}>Start typing to find songs, artists, or users.</p>
        )}

        {!loading && q !== '' && filteredUsers.length === 0 && filteredSongs.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>No results for &quot;{query}&quot;.</p>
        )}

        {filteredUsers.length > 0 && (
          <>
            <h2 className="section-title" style={{ fontSize: '18px' }}>Users</h2>
            {filteredUsers.map((u) => (
              <Link
                href={`/profile/${u.username}`}
                key={u.id}
                className="settings-row"
                style={{ marginBottom: '8px', borderRadius: '10px', border: '1px solid var(--border)' }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: avatarUrl(u) ? `url(${avatarUrl(u)}) center/cover` : 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '14px',
                    flexShrink: 0,
                  }}
                >
                  {!avatarUrl(u) && u.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="settings-row-title">{u.display_name || `@${u.username}`}</div>
                  <div className="settings-row-sub">@{u.username}</div>
                </div>
              </Link>
            ))}
          </>
        )}

        {filteredSongs.length > 0 && (
          <>
            <h2 className="section-title" style={{ fontSize: '18px', marginTop: '24px' }}>Songs</h2>
            <div className="cards-grid">
              {filteredSongs.map((song, index) => (
                <div className="card" key={song.id} onClick={() => playSongAt(index)}>
                  <div className="card-img" style={coverUrl(song) ? { background: `url(${coverUrl(song)}) center/cover` } : {}}>
                    {!coverUrl(song) && <i className="fas fa-music"></i>}
                  </div>
                  <div className="card-title">{song.title}</div>
                  <div className="card-desc">{song.artist}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
                }
