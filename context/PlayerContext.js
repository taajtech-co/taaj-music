'use client';

import { createContext, useContext, useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import Player from '../components/Player';
import NowPlayingFull from '../components/NowPlayingFull';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const audioRef = useRef(null);

  const rawSong = currentIndex >= 0 ? queue[currentIndex] : null;

  const currentSong = useMemo(() => {
    if (!rawSong) return null;
    const audioUrl = supabase.storage.from('songs').getPublicUrl(rawSong.storage_path).data.publicUrl;
    const coverUrl = rawSong.cover_path
      ? supabase.storage.from('covers').getPublicUrl(rawSong.cover_path).data.publicUrl
      : null;
    return {
      id: rawSong.id,
      title: rawSong.title,
      artist: rawSong.artist,
      url: audioUrl,
      cover: coverUrl,
      lyrics: rawSong.lyrics,
      timedLyrics: rawSong.timed_lyrics,
      uploaderUsername: rawSong.profiles?.username || null,
    };
  }, [rawSong]);

  const playQueue = (songs, startIndex = 0) => {
    setQueue(songs);
    setCurrentIndex(startIndex);
    setIsPlaying(true);
    setExpanded(true);
  };

  const playNext = () => {
    if (queue.length === 0) return;
    if (shuffle) {
      if (queue.length === 1) return;
      let next;
      do {
        next = Math.floor(Math.random() * queue.length);
      } while (next === currentIndex);
      setCurrentIndex(next);
    } else {
      const next = currentIndex + 1;
      if (next < queue.length) {
        setCurrentIndex(next);
      } else if (repeatMode === 'all') {
        setCurrentIndex(0);
      }
    }
    setIsPlaying(true);
  };

  const playPrev = () => {
    if (queue.length === 0) return;
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
      return;
    }
    const prev = currentIndex - 1;
    if (prev >= 0) {
      setCurrentIndex(prev);
    } else if (repeatMode === 'all') {
      setCurrentIndex(queue.length - 1);
    }
    setIsPlaying(true);
  };

  const toggleShuffle = () => setShuffle((s) => !s);
  const cycleRepeat = () => {
    setRepeatMode((m) => (m === 'off' ? 'all' : m === 'all' ? 'one' : 'off'));
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
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
    const onEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else {
        playNext();
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [currentIndex, repeatMode, shuffle, queue]);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        playQueue,
        playNext,
        playPrev,
        isPlaying,
        togglePlay,
        expanded,
        setExpanded,
        currentTime,
        duration,
        seekTo,
        shuffle,
        toggleShuffle,
        repeatMode,
        cycleRepeat,
        hasNext: currentIndex < queue.length - 1 || repeatMode === 'all',
        hasPrev: currentIndex > 0 || repeatMode === 'all',
      }}
    >
      {children}

      {currentSong && (
        <audio key={currentSong.url} ref={audioRef} src={currentSong.url} autoPlay />
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
