'use client';

import { useSongPlayer } from '../context/PlayerContext';

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
        <div className="np-eyebrow">Now Playing</div>
        <div style={{ width: '32px' }}></div>
      </div>

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
  );
}
