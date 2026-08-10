'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Navbar from '../../components/Navbar';
import { useSongPlayer } from '../../context/PlayerContext';

export default function LibraryPage() {
  const [checking, setChecking] = useState(true);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playQueue } = useSongPlayer();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setChecking(false);
      if (!data.session) {
        window.location.href = '/login';
        return;
      }
      loadSaved(data.session.user.id);
    });
  }, []);

  const loadSaved = async (userId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('song_interactions')
      .select('song_id, songs(id, title, artist, storage_path, cover_path, lyrics, timed_lyrics, status, profiles(username))')
      .eq('user_id', userId)
      .eq('saved', true);

    if (!error && data) {
      const validSongs = data
        .map((row) => row.songs)
        .filter((s) => s && s.status === 'approved');
      setSongs(validSongs);
    }
    setLoading(false);
  };

  const coverUrl = (song) => {
    if (!song.cover_path) return null;
    return supabase.storage.from('covers').getPublicUrl(song.cover_path).data.publicUrl;
  };

  const playSongAt = (index) => {
    playQueue(songs, index);
  };

  if (checking) return null;

  return (
    <>
      <Navbar />
      <div className="content-area">
        <h1 className="section-title">Your Library</h1>

        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}

        {!loading && songs.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>
            Nothing saved yet. Tap <strong>Save</strong> on any song while it&apos;s playing to add it here.
          </p>
        )}

        <div className="cards-grid">
          {songs.map((song, index) => (
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
