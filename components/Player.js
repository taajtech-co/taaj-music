'use client';

import { useSongPlayer } from '../context/PlayerContext';

export default function Player() {
  const { currentSong, isPlaying, isBuffering, togglePlay, setExpanded } = useSongPlayer();

  if (!currentSong) return null;

  return (
    <div className="player-bar" onClick={() => setExpanded(true)}>
      <div className="now-playing">
        <div
          className="card-img"
          style={currentSong.cover ? { background: `url(${currentSong.cover}) center/cover` } : {}}
        >
          {!currentSong.cover && <i className="fas fa-music"></i>}
        </div>
        <div>
          <div className="song-title">{currentSong.title}</div>
          <div className="song-artist">{currentSong.artist}</div>
        </div>
      </div>

      <button
        className="icon-btn"
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
      >
        {isBuffering ? (
          <span className="buffering-spinner"></span>
        ) : (
          <i className={isPlaying ? 'fas fa-pause' : 'fas fa-play'}></i>
        )}
      </button>
    </div>
  );
}
