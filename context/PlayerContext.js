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
  const [isBuffering, setIsBuffering] = useState(false);
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
    const uploaderAvatarUrl = rawSong.profiles?.avatar_path
      ? supabase.storage.from('avatars').getPublicUrl(rawSong.profiles.avatar_path).data.publicUrl
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
      uploaderAvatarUrl,
    };
  }, [rawSong]);

  const playQueue = (songs, startIndex = 0) => {
    setQueue(songs);
    setCurrentIndex(startIndex);
    setIsPlaying(true);
    setExpanded(true);

    // Count this as a play for trending purposes
    const song = songs[startIndex];
    if (song?.id) {
      supabase.rpc('increment_play_count', { song_id: song.id }).then(() => {});
    }
  };

  const playNext = () => {
    if (queue.length === 0) return;
    let nextIdx = null;
    if (shuffle) {
      if (queue.length === 1) return;
      let next;
      do {
        next = Math.floor(Math.random() * queue.length);
      } while (next === currentIndex);
      nextIdx = next;
      setCurrentIndex(next);
    } else {
      const next = currentIndex + 1;
      if (next < queue.length) {
        nextIdx = next;
        setCurrentIndex(next);
      } else if (repeatMode === 'all') {
        nextIdx = 0;
        setCurrentIndex(0);
      }
    }
    setIsPlaying(true);
    if (nextIdx !== null && queue[nextIdx]?.id) {
      supabase.rpc('increment_play_count', { song_id: queue[nextIdx].id }).then(() => {});
    }
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
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onCanPlay = () => setIsBuffering(false);
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
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('ended', onEnded);

    setIsBuffering(true);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('canplay', onCanPlay);
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
        isBuffering,
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
