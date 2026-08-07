'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Navbar from '../../components/Navbar';

export default function MyUploadsPage() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
      if (!data.session) {
        window.location.href = '/login';
      } else {
        loadSongs(data.session.user.id);
      }
    });
  }, []);

  const loadSongs = async (userId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('songs')
      .select('id, title, artist, status, delete_requested, lyrics, timed_lyrics, created_at')
      .eq('uploader_id', userId)
      .order('created_at', { ascending: false });

    if (!error) setSongs(data);
    setLoading(false);
  };

  const requestDelete = async (songId) => {
    const { error } = await supabase.rpc('request_song_deletion', { song_id: songId });
    if (error) {
      setMessage('Something went wrong: ' + error.message);
    } else {
      setMessage('Deletion requested. An admin will review it.');
      loadSongs(session.user.id);
    }
  };

  const statusLabel = (song) => {
    if (song.delete_requested) return 'Deletion requested';
    if (song.status === 'pending') return 'Pending review';
    if (song.status === 'approved') return 'Live';
    if (song.status === 'rejected') return 'Rejected';
    return song.status;
  };

  const statusColor = (song) => {
    if (song.delete_requested) return '#E5484D';
    if (song.status === 'approved') return 'var(--accent-2)';
    if (song.status === 'rejected') return '#E5484D';
    return 'var(--text-muted)';
  };

  if (checking) return null;

  return (
    <>
      <Navbar />
      <div className="content-area">
        <h1 className="section-title">My uploads</h1>

        {message && (
          <div className="error-msg" style={{ background: 'rgba(47,209,197,0.12)', color: 'var(--accent-2)', marginBottom: '20px' }}>
            {message}
          </div>
        )}

        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}

        {!loading && songs.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>
            You haven&apos;t uploaded any songs yet.{' '}
            <a href="/upload" style={{ color: 'var(--accent)' }}>Upload one.</a>
          </p>
        )}

        {songs.map((song) => (
          <div key={song.id} className="card" style={{ cursor: 'default', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="card-title">{song.title}</div>
                <div className="card-desc">{song.artist}</div>
                <div style={{ fontSize: '12px', color: statusColor(song), marginTop: '6px' }}>
                  {statusLabel(song)}
                </div>
              </div>
              {!song.delete_requested && (
                <button
                  className="btn btn-outline"
                  onClick={() => requestDelete(song.id)}
                  style={{ whiteSpace: 'nowrap', fontSize: '12px' }}
                >
                  Request deletion
                </button>
              )}
            </div>

            <a
              href={`/sync/${song.id}`}
              className="btn btn-outline"
              style={{ marginTop: '14px', fontSize: '12px', display: 'inline-block' }}
            >
              <i className="fas fa-wave-square" style={{ marginRight: '6px' }}></i>
              {song.timed_lyrics ? 'Re-sync lyrics' : 'Sync lyrics'}
            </a>
          </div>
        ))}
      </div>
    </>
  );
                                    }
