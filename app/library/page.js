'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Navbar from '../../components/Navbar';
import { useSongPlayer } from '../../context/PlayerContext';
import { useCachedQuery } from '../../lib/useCachedQuery';

export default function LibraryPage() {
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState(null);
  const { playQueue } = useSongPlayer();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setChecking(false);
      if (!data.session) {
        window.location.href = '/login';
        return;
      }
      setUserId(data.session.user.id);
    });
  }, []);

  const fetchSaved = async () => {
    const { data, error } = await supabase
      .from('song_interactions')
      .select('song_id, songs(id, title, artist, storage_path, cover_path, lyrics, timed_lyrics, status, profiles(username, avatar_path))')
      .eq('user_id', userId)
      .eq('saved', true);
    if (error) throw error;
    return data
      .map((row) => row.songs)
      .filter((s) => s && s.status === 'approved');
  };

  const { data: songs, loading } = useCachedQuery(
    userId ? `library:${userId}` : null,
    fetchSaved,
    20000 // shorter cache time since this list changes often as you save/unsave songs
  );

  const allSongs = songs || [];

  const coverUrl = (song) => {
    if (!song.cover_path) return null;
    return supabase.storage.from('covers').getPublicUrl(song.cover_path).data.publicUrl;
  };

  const playSongAt = (index) => {
    playQueue(allSongs, index);
  };

  if (checking) return null;

  return (
    <>
      <Navbar />
      <div className="content-area">
        <h1 className="section-title">Your Library</h1>

        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}

        {!loading && allSongs.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>
            Nothing saved yet. Tap <strong>Save</strong> on any song while it&apos;s playing to add it here.
          </p>
        )}

        <div className="cards-grid">
          {allSongs.map((song, index) => (
            <div className="card" key={song.id} onClick={() => playSongAt(index)}>
              <div className="card-img" style={coverUrl(song) ? { background: `url(${coverUrl(song)}) center/cover` } : {}}>
                {!coverUrl(song) && <i className="fas fa-music"></i>}
              </div>
              <div className="card-title">{song.title}</div>
              <div className="card-desc">{song.artist}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
        }
