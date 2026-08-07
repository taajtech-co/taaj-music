'use client';

import { useEffect, useRef, useState } from 'react';
import { useSongPlayer } from '../context/PlayerContext';
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
  } = useSongPlayer();

  const lineRefs = useRef([]);
  const scrollRef = useRef(null);
  const [pastHero, setPastHero] = useState(false);

  const timedLines = currentSong ? parseTimedLyrics(currentSong.timedLyrics) : null;
  const activeIndex = timedLines ? getActiveLineIndex(timedLines, currentTime) : -1;

  useEffect(() => {
    if (activeIndex >= 0 && lineRefs.current[activeIndex]) {
      lineRefs.current[activeIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    setPastHero(scrollRef.current.scrollTop > 320);
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
          {pastHero ? `Now Playing: ${currentSong.title}` : ''}
        </div>
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

          <div className="np-progress-bar" onClick={handleSeek}>
            <div className="np-progress-fill" style={{ width: `${pct}%` }}></div>
          </div>
          <div className="np-time-row">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <button className="np-play-btn" onClick={togglePlay}>
            <i className={isPlaying ? 'fas fa-pause' : 'fas fa-play'}></i>
          </button>
        </div>

        <div className="np-lyrics-section">
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
