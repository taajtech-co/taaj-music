'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import { useSongPlayer } from '../context/PlayerContext';
import { useCachedQuery } from '../lib/useCachedQuery';

async function fetchApprovedSongs() {
  const { data, error } = await supabase
    .from('songs')
    .select('id, title, artist, genre, storage_path, cover_path, lyrics, timed_lyrics, play_count, created_at, profiles(username, avatar_path)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');
  const { playQueue } = useSongPlayer();
  const { data: songs, loading } = useCachedQuery('songs:approved', fetchApprovedSongs);

  const coverUrl = (song) => {
    if (!song.cover_path) return null;
    return supabase.storage.from('covers').getPublicUrl(song.cover_path).data.publicUrl;
  };

  const allSongs = songs || [];

  const trending = [...allSongs]
    .filter((s) => s.play_count > 0)
    .sort((a, b) => b.play_count - a.play_count)
    .slice(0, 12);

  const trendingPages = chunk(trending, 6);

  const genresPresent = ['All', ...new Set(allSongs.map((s) => s.genre).filter(Boolean))];

  const genreFiltered = activeGenre === 'All'
    ? allSongs
    : allSongs.filter((s) => s.genre === activeGenre);

  const filteredSongs = genreFiltered.filter((song) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return song.title.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q);
  });

  const playSongAt = (index) => {
    playQueue(filteredSongs, index);
  };

  const playTrendingAt = (index) => {
    playQueue(trending, index);
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

      {!loading && genresPresent.length > 1 && (
        <div className="genre-chips">
          {genresPresent.map((g) => (
            <button
              key={g}
              className={`genre-chip ${activeGenre === g ? 'active' : ''}`}
              onClick={() => setActiveGenre(g)}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {!loading && !query && trending.length > 0 && (
        <>
          <div className="content-area" style={{ paddingBottom: 0 }}>
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-fire" style={{ color: '#F5A623', fontSize: '16px' }}></i>
              Trending now
            </h2>
          </div>

          <div className="trending-pager">
            {trendingPages.map((page, pageIndex) => (
              <div className="trending-page" key={pageIndex}>
                <div className="trending-page-grid">
                  {page.map((song, i) => {
                    const overallIndex = pageIndex * 6 + i;
                    return (
                      <div
                        className="trending-row"
                        key={song.id}
                        onClick={() => playTrendingAt(overallIndex)}
                      >
                        <div className="trending-row-rank">#{overallIndex + 1}</div>
                        <div
                          className="trending-row-thumb"
                          style={coverUrl(song) ? { background: `url(${coverUrl(song)}) center/cover` } : {}}
                        >
                          {!coverUrl(song) && <i className="fas fa-music"></i>}
                        </div>
                        <div className="trending-row-info">
                          <div className="trending-row-title">{song.title}</div>
                          <div className="trending-row-artist">{song.artist}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="content-area">
        <h2 className="section-title">
          {query ? `Results for "${query}"` : (activeGenre === 'All' ? 'All songs' : activeGenre)}
        </h2>

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
      </div>
    </>
  );
      }
