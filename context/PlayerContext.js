'use client';

import { createContext, useContext, useState } from 'react';
import Player from '../components/Player';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);

  return (
    <PlayerContext.Provider value={{ currentSong, setCurrentSong }}>
      {children}
      <Player currentSong={currentSong} />
    </PlayerContext.Provider>
  );
}

export function useSongPlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('useSongPlayer must be used within PlayerProvider');
  return ctx;
      }
