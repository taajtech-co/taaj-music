'use client';

import { createContext, useContext, useRef } from 'react';

const DataCacheContext = createContext(null);

// A simple in-memory cache that lives above page navigation, so switching
// pages doesn't always mean re-fetching from Supabase from zero.
export function DataCacheProvider({ children }) {
  const store = useRef(new Map());

  const getCached = (key, ttlMs) => {
    const entry = store.current.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttlMs) return null;
    return entry.data;
  };

  const setCached = (key, data) => {
    store.current.set(key, { data, timestamp: Date.now() });
  };

  const clearCached = (key) => {
    store.current.delete(key);
  };

  return (
    <DataCacheContext.Provider value={{ getCached, setCached, clearCached }}>
      {children}
    </DataCacheContext.Provider>
  );
}

export function useDataCache() {
  const ctx = useContext(DataCacheContext);
  if (!ctx) throw new Error('useDataCache must be used within DataCacheProvider');
  return ctx;
}
