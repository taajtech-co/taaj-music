'use client';

import { useEffect, useRef, useState } from 'react';
import { useSongPlayer } from '../context/PlayerContext';
import { supabase } from '../lib/supabaseClient';
import { parseTimedLyrics, getActiveLineIndex } from '../lib/lrc';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

export default function NowPlayingFull() {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    setExpanded,
    currentTime,
    duration,
    seekTo,
    playNext,
    playPrev,
    hasNext,
    hasPrev,
    shuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
  } = useSongPlayer();

  const lineRefs = useRef([]);
  const lyricsScrollRef = useRef(null);
  const heroScrollRef = useRef(null);
  const [pastHero, setPastHero] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [userId, setUserId] = useState(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);

  const timedLines = currentSong ? parseTimedLyrics(currentSong.timedLyrics) : null;
  const activeIndex = timedLines ? getActiveLineIndex(timedLines, currentTime) : -1;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setUserId(data.session.user.id);
    });
  }, []);

  const loadInteraction = async () => {
    if (!currentSong?.id) return;

    const { data: songData } = await supabase
      .from('songs')
      .select('like_count')
      .eq('id', currentSong.id)
      .single();
    setLikeCount(songData?.like_count || 0);

    if (!userId) {
      setLiked(false);
      setSaved(false);
      return;
    }
    const { data } = await supabase
      .from('song_interactions')
      .select('liked, saved')
      .eq('user_id', userId)
      .eq('song_id', currentSong.id)
      .maybeSingle();
    setLiked(data?.liked || false);
    setSaved(data?.saved || false);
  };

  useEffect(() => {
    loadInteraction();
    setShowLyrics(false);
  }, [userId, currentSong?.id]);

  useEffect(() => {
    if (showLyrics && activeIndex >= 0 && lineRefs.current[activeIndex] && lyricsScrollRef.current) {
      lineRefs.current[activeIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex, showLyrics]);

  const handleHeroScroll = () => {
    if (!heroScrollRef.current) return;
    setPastHero(heroScrollRef.current.scrollTop > 320);
  };

  const openLyrics = () => setShowLyrics(true);
  const closeLyrics = () => setShowLyrics(false);

  const toggleLiked = async () => {
    if (!userId || !currentSong?.id) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => (next ? c + 1 : Math.max(c - 1, 0)));

    if (next) {
      setLikeAnimating(true);
      setTimeout(() => setLikeAnimating(false), 500);
    }

    await supabase
      .from('song_interactions')
      .upsert({ user_id: userId, song_id: currentSong.id, liked: next }, { onConflict: 'user_id,song_id' });
  };

  const toggleSaved = async () => {
    if (!userId || !currentSong?.id) return;
    const next = !saved;
    setSaved(next);
    await supabase
      .from('song_interactions')
      .upsert({ user_id: userId, song_id: currentSong.id, saved: next }, { onConflict: 'user_id,song_id' });
  };

  if (!currentSong) return null;

  const pct = duration ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPct = (e.clientX - rect.left) / rect.width;
    seekTo(Math.max(0, Math.min(1, clickPct)));
  };

  return (
    <div className="now-playing-full">
      <div className="np-topbar">
        <button className="np-collapse" onClick={() => setExpanded(false)}>
          <i className="fas fa-chevron-down"></i>
        </button>
        <div className="np-eyebrow">
          {showLyrics
            ? `Now Playing: ${currentSong.title}`
            : (pastHero ? `Now Playing: ${currentSong.title}` : '')}
        </div>
        <div style={{ width: '32px' }}></div>
      </div>

      {!showLyrics && (
        <div className="np-scroll" ref={heroScrollRef} onScroll={handleHeroScroll}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              className="np-cover"
              style={currentSong.cover ? { background: `url(${currentSong.cover}) center/cover` } : {}}
            >
              {!currentSong.cover && <i className="fas fa-music"></i>}
            </div>

            <div className="np-title">{currentSong.title}</div>
            <div className="np-artist">{currentSong.artist}</div>

            <div className="np-action-row">
              <button className={`np-pill ${liked ? 'active' : ''} ${likeAnimating ? 'burst-ring' : ''}`} onClick={toggleLiked}>
                <i className={`${liked ? 'fas fa-heart' : 'far fa-heart'} ${likeAnimating ? 'like-pop' : ''}`}></i>
                Like
                {likeCount > 0 && <span className="like-count">{formatCount(likeCount)}</span>}
              </button>
              <button className="np-pill" onClick={openLyrics}>
                <i className="fas fa-quote-right"></i> Lyrics
              </button>
              <button className={`np-pill ${saved ? 'active' : ''}`} onClick={toggleSaved}>
                <i className={saved ? 'fas fa-square-check' : 'fas fa-square-plus'}></i> Save
              </button>
            </div>

            <div className="np-progress-bar" onClick={handleSeek}>
              <div className="np-progress-fill" style={{ width: `${pct}%` }}></div>
            </div>
            <div className="np-time-row">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div className="np-transport-row">
              <button
                className={`np-transport-btn small ${shuffle ? 'active' : ''}`}
                onClick={toggleShuffle}
              >
                <i className="fas fa-shuffle"></i>
              </button>
              <button className="np-transport-btn" onClick={playPrev} disabled={!hasPrev}>
                <i className="fas fa-backward-step"></i>
              </button>
              <button className="np-play-btn" onClick={togglePlay} style={{ marginBottom: 0 }}>
                <i className={isPlaying ? 'fas fa-pause' : 'fas fa-play'}></i>
              </button>
              <button className="np-transport-btn" onClick={playNext} disabled={!hasNext}>
                <i className="fas fa-forward-step"></i>
              </button>
              <button
                className={`np-transport-btn small ${repeatMode !== 'off' ? 'active' : ''}`}
                onClick={cycleRepeat}
              >
                <i className={repeatMode === 'one' ? 'fas fa-1' : 'fas fa-repeat'}></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {showLyrics && (
        <div className="np-lyrics-full">
          <div className="np-lyrics-header-row-fixed">
            <div className="np-lyrics-heading">Lyrics</div>
            <button className="np-lyrics-close" onClick={closeLyrics}>
              <i className="fas fa-xmark"></i>
            </button>
          </div>

          <div className="np-lyrics-scroll" ref={lyricsScrollRef}>
            {timedLines && timedLines.length > 0 ? (
              <div>
                {timedLines.map((line, i) => (
                  <div
                    key={i}
                    ref={(el) => (lineRefs.current[i] = el)}
                    className={`np-lyrics-line ${i === activeIndex ? 'active' : ''}`}
                    onClick={() => seekTo(line.time / duration)}
                  >
                    {line.text}
                  </div>
                ))}
              </div>
            ) : currentSong.lyrics ? (
              <div className="np-lyrics-text">{currentSong.lyrics}</div>
            ) : (
              <div className="np-lyrics-empty">No lyrics added for this song yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
      }
