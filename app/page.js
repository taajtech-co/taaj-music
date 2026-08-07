'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import { useSongPlayer } from '../context/PlayerContext';

export default function HomePage() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const { setCurrentSong } = useSongPlayer();

  useEffect(() => {
    const loadSongs = async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('id, title, artist, storage_path, cover_path, lyrics, timed_lyrics, created_at')
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
    setCurrentSong({
      title: song.title,
      artist: song.artist,
      url: data.publicUrl,
      cover: coverUrl(song),
      lyrics: song.lyrics,
      timedLyrics: song.timed_lyrics,
    });
  };

  const filteredSongs = songs.filter((song) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return song.title.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q);
  });

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

      <div className="search-wrap">
        <div className="search-input-box">
          <i className="fas fa-magnifying-glass"></i>
          <input
            type="text"
            placeholder="Search songs or artists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="content-area">
        <h2 className="section-title">{query ? `Results for "${query}"` : 'All songs'}</h2>

        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading songs...</p>}

        {!loading && filteredSongs.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>
            {query ? 'No songs match your search.' : (
              <>
                No approved songs yet.{' '}
                <a href="/upload" style={{ color: 'var(--accent)' }}>Upload one for review.</a>
              </>
            )}
          </p>
        )}

        <div className="cards-grid">
          {filteredSongs.map((song) => (
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
