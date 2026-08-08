'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import { linesToTimedJson } from '../../../lib/lrc';

export default function SyncPage() {
  const { songId } = useParams();
  const [checking, setChecking] = useState(true);
  const [song, setSong] = useState(null);
  const [step, setStep] = useState('choose'); // choose -> paste -> sync -> ai-loading -> review -> done
  const [rawLyrics, setRawLyrics] = useState('');
  const [lines, setLines] = useState([]);
  const [timestamps, setTimestamps] = useState([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiTimedLines, setAiTimedLines] = useState([]);
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

  const audioUrl = song ? supabase.storage.from('songs').getPublicUrl(song.storage_path).data.publicUrl : null;

  // ===== AI generation =====
  const runAiSync = async () => {
    setStep('ai-loading');
    setMessage('');
    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setMessage(json.error || 'Something went wrong generating lyrics.');
        setStep('choose');
        return;
      }
      setAiTimedLines(json.lines);
      setStep('review');
    } catch (err) {
      setMessage('Could not reach the AI service: ' + err.message);
      setStep('choose');
    }
  };

  const updateAiLine = (index, newText) => {
    setAiTimedLines((prev) => prev.map((l, i) => (i === index ? { ...l, text: newText } : l)));
  };

  const removeAiLine = (index) => {
    setAiTimedLines((prev) => prev.filter((_, i) => i !== index));
  };

  const saveAiLyrics = async () => {
    setSaving(true);
    const plainText = aiTimedLines.map((l) => l.text).join('\n');

    await supabase.rpc('update_timed_lyrics', {
      song_id: song.id,
      new_timed_lyrics: JSON.stringify(aiTimedLines),
    });
    await supabase.rpc('update_song_lyrics', {
      song_id: song.id,
      new_lyrics: plainText,
    });

    setSaving(false);
    window.location.href = '/my-uploads';
  };

  // ===== Manual tap-sync (unchanged) =====
  const startManualSync = () => {
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
    setStep('choose');
    setTimestamps([]);
    setLineIndex(0);
    if (audioRef.current) audioRef.current.pause();
  };

  const saveManualSync = async () => {
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

  return (
    <>
      <div className="settings-topbar">
        <a href="/my-uploads" className="settings-back"><i className="fas fa-arrow-left"></i></a>
        <div className="settings-topbar-title">Sync lyrics</div>
        <div style={{ width: '32px' }}></div>
      </div>

      {audioUrl && <audio ref={audioRef} src={audioUrl} />}

      {step === 'choose' && (
        <div className="sync-wrap">
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
            How do you want to add synced lyrics for <strong style={{ color: 'var(--text)' }}>{song?.title}</strong>?
          </p>

          {message && <div className="error-msg" style={{ marginBottom: '16px' }}>{message}</div>}

          <div className="card" style={{ marginBottom: '14px' }} onClick={runAiSync}>
            <div className="card-title"><i className="fas fa-wand-magic-sparkles" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>Generate with AI</div>
            <div className="card-desc">Listens to the song and creates timed lyrics automatically. Review before saving.</div>
          </div>

          <div className="card" onClick={() => setStep('paste')}>
            <div className="card-title"><i className="fas fa-hand-pointer" style={{ marginRight: '8px', color: 'var(--text-muted)' }}></i>Do it myself</div>
            <div className="card-desc">Paste the lyrics and tap along with the song to time each line.</div>
          </div>
        </div>
      )}

      {step === 'ai-loading' && (
        <div className="sync-stage">
          <i className="fas fa-wand-magic-sparkles" style={{ fontSize: '36px', color: 'var(--accent)', marginBottom: '16px' }}></i>
          <p>Listening to the song and generating lyrics...</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>This can take a minute.</p>
        </div>
      )}

      {step === 'review' && (
        <div className="sync-wrap">
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
            Review the AI-generated lines below. Fix any mistakes, delete lines that shouldn&apos;t be there, then save.
          </p>
          {aiTimedLines.map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', minWidth: '38px' }}>
                {Math.floor(line.time / 60)}:{String(Math.floor(line.time % 60)).padStart(2, '0')}
              </span>
              <input
                type="text"
                value={line.text}
                onChange={(e) => updateAiLine(i, e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  color: 'var(--text)',
                  fontSize: '13px',
                }}
              />
              <button
                onClick={() => removeAiLine(i)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '16px', cursor: 'pointer' }}
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          ))}
          <div className="sync-controls-row" style={{ marginTop: '20px' }}>
            <button className="btn btn-outline" onClick={() => setStep('choose')}>Start over</button>
            <button className="btn btn-primary" onClick={saveAiLyrics} disabled={saving}>
              {saving ? 'Saving...' : 'Save lyrics'}
            </button>
          </div>
        </div>
      )}

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
          <button className="btn btn-primary" onClick={startManualSync} style={{ width: '100%', padding: '12px', borderRadius: '999px' }}>
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
            <button className="btn btn-primary" onClick={saveManualSync} disabled={saving}>
              {saving ? 'Saving...' : 'Save synced lyrics'}
            </button>
          </div>
        </div>
      )}
    </>
  );
               }
