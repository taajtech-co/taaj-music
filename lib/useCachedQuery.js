'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDataCache } from '../context/DataCacheContext';

// key: a unique string identifying this data (e.g. 'songs:approved', `library:${userId}`)
// queryFn: an async function that fetches and returns the data
// ttlMs: how long the cached result stays valid before a fresh fetch happens
export function useCachedQuery(key, queryFn, ttlMs = 45000) {
  const { getCached, setCached } = useDataCache();
  const initial = key ? getCached(key, ttlMs) : null;
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(!initial);

  const run = useCallback(async () => {
    setLoading((prev) => (data ? false : true));
    const result = await queryFn();
    setData(result);
    setCached(key, result);
    setLoading(false);
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!key) return;
    const existing = getCached(key, ttlMs);
    if (existing) {
      setData(existing);
      setLoading(false);
    } else {
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading, refresh: run };
}
