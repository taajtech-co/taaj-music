'use client';

import { useEffect, useState } from 'react';

export default function LoadingSplash() {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHide(true), 1100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`loading-splash-v2 ${hide ? 'hide' : ''}`}>
      <div className="loading-glow-v2"></div>
      <div className="loading-stack-v2">
        <img src="/taaj_full_logo.png" alt="Taaj Music" />
        <div className="loading-bars-v2">
          <div className="lbar"></div>
          <div className="lbar"></div>
          <div className="lbar"></div>
          <div className="lbar"></div>
          <div className="lbar"></div>
        </div>
      </div>
    </div>
  );
  }
