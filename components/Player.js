'use client';

export default function Player({ currentSong }) {
  if (!currentSong) return null;

  return (
    <div className="player-bar">
      <div className="now-playing">
        <div className="card-img">
          <i className="fas fa-music"></i>
        </div>
        <div>
          <div className="song-title">{currentSong.title}</div>
          <div className="song-artist">{currentSong.artist}</div>
        </div>
      </div>
      <div className="player-audio">
        {/* key forces the audio element to reload when the song changes */}
        <audio key={currentSong.url} controls autoPlay src={currentSong.url}>
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>
  );
    }
