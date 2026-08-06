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
      .select('id, title, artist, status, delete_requested, created_at')
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
    if (song.delete_requested) return '#ff8080';
    if (song.status === 'approved') return 'var(--primary)';
    if (song.status === 'rejected') return '#ff8080';
    return 'var(--gray)';
  };

  if (checking) return null;

  return (
    <>
      <Navbar />
      <div className="content-area">
        <h1 className="section-title">My uploads</h1>

        {message && (
          <div className="error-msg" style={{ background: 'rgba(29,185,84,0.15)', color: 'var(--primary)', marginBottom: '20px' }}>
            {message}
          </div>
        )}

        {loading && <p style={{ color: 'var(--gray)' }}>Loading...</p>}

        {!loading && songs.length === 0 && (
          <p style={{ color: 'var(--gray)' }}>
            You haven&apos;t uploaded any songs yet.{' '}
            <a href="/upload" style={{ color: 'var(--primary)' }}>
              Upload one.
            </a>
          </p>
        )}

        {songs.map((song) => (
          <div
            key={song.id}
            className="card"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}
          >
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
                style={{ whiteSpace: 'nowrap' }}
              >
                Request deletion
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
      }
