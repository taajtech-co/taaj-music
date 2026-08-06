'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import { useSongPlayer } from '../context/PlayerContext';

export default function HomePage() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setCurrentSong } = useSongPlayer();

  useEffect(() => {
    const loadSongs = async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('id, title, artist, storage_path, cover_path, created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (!error) setSongs(data);
      setLoading(false);
    };
    loadSongs();
  }, []);

  const coverUrl = (song) => {
    if (!song.cover_path) return null;
    return supabase.storage.from('covers').getPublicUrl(song.cover_path).data.publicUrl;
  };

  const playSong = (song) => {
    const { data } = supabase.storage.from('songs').getPublicUrl(song.storage_path);
    setCurrentSong({ title: song.title, artist: song.artist, url: data.publicUrl, cover: coverUrl(song) });
  };

  return (
    <>
      <Navbar />

      <div className="hero">
        <div className="hero-eyebrow">Every genre, one stream</div>
        <h1 className="hero-title">Sounds worth<br />hitting play on.</h1>
        <p className="hero-sub">
          Discover tracks uploaded by people like you — every song reviewed before it goes live.
        </p>
      </div>

      <div className="content-area">
        <h2 className="section-title">All songs</h2>

        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading songs...</p>}

        {!loading && songs.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>
            No approved songs yet.{' '}
            <a href="/upload" style={{ color: 'var(--accent)' }}>
              Upload one for review.
            </a>
          </p>
        )}

        <div className="cards-grid">
          {songs.map((song) => (
            <div className="card" key={song.id} onClick={() => playSong(song)}>
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
