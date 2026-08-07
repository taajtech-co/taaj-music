'use client';

import { createContext, useContext, useState, useRef, useEffect } from 'react';
import Player from '../components/Player';
import NowPlayingFull from '../components/NowPlayingFull';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentSong, setCurrentSongState] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const setCurrentSong = (song) => {
    setCurrentSongState(song);
    setIsPlaying(true);
    setExpanded(true);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const seekTo = (pct) => {
    if (!audioRef.current || !duration) return;
    audioRef.current.currentTime = pct * duration;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [currentSong]);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        setCurrentSong,
        isPlaying,
        togglePlay,
        expanded,
        setExpanded,
        currentTime,
        duration,
        seekTo,
      }}
    >
      {children}

      {currentSong && (
        <audio
          key={currentSong.url}
          ref={audioRef}
          src={currentSong.url}
          autoPlay
        />
      )}

      {currentSong && !expanded && <Player />}
      {currentSong && expanded && <NowPlayingFull />}
    </PlayerContext.Provider>
  );
}

export function useSongPlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('useSongPlayer must be used within PlayerProvider');
  return ctx;
  }
