'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import Player from '../components/Player';

export default function HomePage() {
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSongs = async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('id, title, artist, storage_path, created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (!error) setSongs(data);
      setLoading(false);
    };
    loadSongs();
  }, []);

  const playSong = (song) => {
    const { data } = supabase.storage.from('songs').getPublicUrl(song.storage_path);
    setCurrentSong({ title: song.title, artist: song.artist, url: data.publicUrl });
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
              <div className="card-img">
                <i className="fas fa-music"></i>
              </div>
              <div className="card-title">{song.title}</div>
              <div className="card-desc">{song.artist}</div>
            </div>
          ))}
        </div>
      </div>

      <Player currentSong={currentSong} />
    </>
  );
    }
