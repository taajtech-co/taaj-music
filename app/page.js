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
      <div className="content-area">
        <h1 className="section-title">All songs</h1>

        {loading && <p style={{ color: 'var(--gray)' }}>Loading songs...</p>}

        {!loading && songs.length === 0 && (
          <p style={{ color: 'var(--gray)' }}>
            No songs yet.{' '}
            <a href="/upload" style={{ color: 'var(--primary)' }}>
              Be the first to upload one.
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
