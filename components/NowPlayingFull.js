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
  const lyricsSectionRef = useRef(null);
  const scrollRef = useRef(null);
  const [pastHero, setPastHero] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState(null);

  const timedLines = currentSong ? parseTimedLyrics(currentSong.timedLyrics) : null;
  const activeIndex = timedLines ? getActiveLineIndex(timedLines, currentTime) : -1;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setUserId(data.session.user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId || !currentSong?.id) {
      setLiked(false);
      setSaved(false);
      return;
    }
    supabase
      .from('song_interactions')
      .select('liked, saved')
      .eq('user_id', userId)
      .eq('song_id', currentSong.id)
      .maybeSingle()
      .then(({ data }) => {
        setLiked(data?.liked || false);
        setSaved(data?.saved || false);
      });
  }, [userId, currentSong?.id]);

  useEffect(() => {
    if (activeIndex >= 0 && lineRefs.current[activeIndex]) {
      lineRefs.current[activeIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    setPastHero(scrollRef.current.scrollTop > 320);
  };

  const jumpToLyrics = () => {
    lyricsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleLiked = async () => {
    if (!userId || !currentSong?.id) return;
    const next = !liked;
    setLiked(next);
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
        <div className="np-eyebrow">{pastHero ? `Now Playing: ${currentSong.title}` : ''}</div>
        <div style={{ width: '32px' }}></div>
      </div>

      <div className="np-scroll" ref={scrollRef} onScroll={handleScroll}>
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
            <button className={`np-pill ${liked ? 'active' : ''}`} onClick={toggleLiked}>
              <i className={liked ? 'fas fa-heart' : 'far fa-heart'}></i> Like
            </button>
            <button className="np-pill" onClick={jumpToLyrics}>
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

        <div className="np-lyrics-section" ref={lyricsSectionRef}>
          <div className="np-lyrics-heading">Lyrics</div>

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
    </div>
  );
    }
