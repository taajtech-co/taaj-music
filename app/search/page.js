'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Navbar from '../../components/Navbar';
import { useSongPlayer } from '../../context/PlayerContext';

export default function SearchPage() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const { playQueue } = useSongPlayer();

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

  const filteredSongs = songs.filter((song) => {
    const q = query.trim().toLowerCase();
    if (!q) return false;
    return song.title.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q);
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
            placeholder="Search songs or artists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="content-area">
        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}

        {!loading && query.trim() === '' && (
          <p style={{ color: 'var(--text-muted)' }}>Start typing to find songs or artists.</p>
        )}

        {!loading && query.trim() !== '' && filteredSongs.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>No songs match &quot;{query}&quot;.</p>
        )}

        {filteredSongs.length > 0 && (
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
        )}
      </div>
    </>
  );
}
