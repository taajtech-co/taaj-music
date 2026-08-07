'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { linesToTimedJson } from '../../../lib/lrc';

export default function SyncPage() {
  const { songId } = useParams();
  const [checking, setChecking] = useState(true);
  const [song, setSong] = useState(null);
  const [step, setStep] = useState('paste'); // paste -> sync -> done
  const [rawLyrics, setRawLyrics] = useState('');
  const [lines, setLines] = useState([]);
  const [timestamps, setTimestamps] = useState([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.href = '/login';
        return;
      }
      supabase
        .from('songs')
        .select('id, title, artist, storage_path, lyrics, uploader_id')
        .eq('id', songId)
        .single()
        .then(({ data: songData }) => {
          if (!songData || songData.uploader_id !== data.session.user.id) {
            window.location.href = '/my-uploads';
            return;
          }
          setSong(songData);
          if (songData.lyrics) setRawLyrics(songData.lyrics);
          setChecking(false);
        });
    });
  }, [songId]);

  const startSync = () => {
    const cleanLines = rawLyrics
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (cleanLines.length === 0) {
      setMessage('Paste in the lyrics first.');
      return;
    }

    setLines(cleanLines);
    setTimestamps([]);
    setLineIndex(0);
    setStep('sync');

    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    }, 100);
  };

  const markLine = () => {
    if (!audioRef.current) return;
    const t = audioRef.current.currentTime;
    const updated = [...timestamps, t];
    setTimestamps(updated);

    if (lineIndex + 1 < lines.length) {
      setLineIndex(lineIndex + 1);
    } else {
      audioRef.current.pause();
      setStep('done');
    }
  };

  const restart = () => {
    setStep('paste');
    setTimestamps([]);
    setLineIndex(0);
    if (audioRef.current) audioRef.current.pause();
  };

  const saveSync = async () => {
    setSaving(true);
    const timedJson = JSON.stringify(linesToTimedJson(lines, timestamps));

    await supabase.rpc('update_timed_lyrics', {
      song_id: song.id,
      new_timed_lyrics: timedJson,
    });
    await supabase.rpc('update_song_lyrics', {
      song_id: song.id,
      new_lyrics: rawLyrics,
    });

    setSaving(false);
    window.location.href = '/my-uploads';
  };

  if (checking) return null;

  const audioUrl = song ? supabase.storage.from('songs').getPublicUrl(song.storage_path).data.publicUrl : null;

  return (
    <>
      <div className="settings-topbar">
        <a href="/my-uploads" className="settings-back"><i className="fas fa-arrow-left"></i></a>
        <div className="settings-topbar-title">Sync lyrics</div>
        <div style={{ width: '32px' }}></div>
      </div>

      {audioUrl && <audio ref={audioRef} src={audioUrl} />}

      {step === 'paste' && (
        <div className="sync-wrap">
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '14px' }}>
            Paste the lyrics for <strong style={{ color: 'var(--text)' }}>{song?.title}</strong>, one line per row.
            The song will play and you&apos;ll tap a button right when each line starts.
          </p>
          <textarea
            className="sync-textarea"
            value={rawLyrics}
            onChange={(e) => setRawLyrics(e.target.value)}
            placeholder={'First line of the song\nSecond line...\nThird line...'}
          />
          {message && <div className="error-msg">{message}</div>}
          <button className="btn btn-primary" onClick={startSync} style={{ width: '100%', padding: '12px', borderRadius: '999px' }}>
            Start syncing
          </button>
        </div>
      )}

      {step === 'sync' && (
        <div className="sync-stage">
          <div className="sync-progress">Line {lineIndex + 1} of {lines.length}</div>
          <div className="sync-current-line">{lines[lineIndex]}</div>
          <div className="sync-next-line">
            {lineIndex + 1 < lines.length ? `Next: ${lines[lineIndex + 1]}` : 'Last line'}
          </div>
          <button className="sync-mark-btn" onClick={markLine}>
            TAP ON<br />THIS LINE
          </button>
          <div className="sync-time">
            {audioRef.current ? Math.floor(audioRef.current.currentTime) + 's' : '0s'}
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="sync-stage">
          <i className="fas fa-circle-check" style={{ fontSize: '40px', color: 'var(--accent-2)', marginBottom: '16px' }}></i>
          <p style={{ marginBottom: '24px' }}>All lines timed. Ready to save?</p>
          <div className="sync-controls-row">
            <button className="btn btn-outline" onClick={restart}>Redo</button>
            <button className="btn btn-primary" onClick={saveSync} disabled={saving}>
              {saving ? 'Saving...' : 'Save synced lyrics'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
