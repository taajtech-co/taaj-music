'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Navbar from '../../components/Navbar';

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pending, setPending] = useState([]);
  const [deleteRequests, setDeleteRequests] = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        window.location.href = '/login';
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', sessionData.session.user.id)
        .single();

      if (!profile?.is_admin) {
        window.location.href = '/';
        return;
      }

      setIsAdmin(true);
      setChecking(false);
      loadAll();
    };
    check();
  }, []);

  const loadAll = async () => {
    setLoading(true);

    const { data: pendingSongs } = await supabase
      .from('songs')
      .select('id, title, artist, storage_path, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    const { data: deleteReqs } = await supabase
      .from('songs')
      .select('id, title, artist, storage_path, created_at')
      .eq('delete_requested', true)
      .order('created_at', { ascending: true });

    const { data: approvedSongs } = await supabase
      .from('songs')
      .select('id, title, artist, storage_path, created_at')
      .eq('status', 'approved')
      .eq('delete_requested', false)
      .order('created_at', { ascending: false });

    setPending(pendingSongs || []);
    setDeleteRequests(deleteReqs || []);
    setApproved(approvedSongs || []);
    setLoading(false);
  };

  const previewUrl = (path) => supabase.storage.from('songs').getPublicUrl(path).data.publicUrl;

  const approveSong = async (id) => {
    await supabase.from('songs').update({ status: 'approved' }).eq('id', id);
    loadAll();
  };

  const rejectSong = async (id) => {
    await supabase.from('songs').update({ status: 'rejected' }).eq('id', id);
    loadAll();
  };

  const confirmDelete = async (id, storagePath) => {
    await supabase.storage.from('songs').remove([storagePath]);
    await supabase.from('songs').delete().eq('id', id);
    loadAll();
  };

  const denyDelete = async (id) => {
    await supabase.from('songs').update({ delete_requested: false }).eq('id', id);
    loadAll();
  };

  if (checking || !isAdmin) return null;

  return (
    <>
      <Navbar />
      <div className="content-area">
        <h1 className="section-title">Admin review</h1>

        {loading && <p style={{ color: 'var(--gray)' }}>Loading...</p>}

        {!loading && (
          <>
            <h2 style={{ fontSize: '18px', margin: '20px 0 10px' }}>
              Pending uploads ({pending.length})
            </h2>
            {pending.length === 0 && <p style={{ color: 'var(--gray)' }}>Nothing pending.</p>}
            {pending.map((song) => (
              <div key={song.id} className="card" style={{ marginBottom: '12px' }}>
                <div className="card-title">{song.title}</div>
                <div className="card-desc">{song.artist}</div>
                <audio controls src={previewUrl(song.storage_path)} style={{ width: '100%', marginTop: '10px' }} />
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button className="btn btn-primary" onClick={() => approveSong(song.id)}>Approve</button>
                  <button className="btn btn-outline" onClick={() => rejectSong(song.id)}>Reject</button>
                </div>
              </div>
            ))}

            <h2 style={{ fontSize: '18px', margin: '30px 0 10px' }}>
              Deletion requests ({deleteRequests.length})
            </h2>
            {deleteRequests.length === 0 && <p style={{ color: 'var(--gray)' }}>None right now.</p>}
            {deleteRequests.map((song) => (
              <div key={song.id} className="card" style={{ marginBottom: '12px' }}>
                <div className="card-title">{song.title}</div>
                <div className="card-desc">{song.artist}</div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button className="btn btn-primary" onClick={() => confirmDelete(song.id, song.storage_path)}>
                    Confirm delete
                  </button>
                  <button className="btn btn-outline" onClick={() => denyDelete(song.id)}>Deny</button>
                </div>
              </div>
            ))}

            <h2 style={{ fontSize: '18px', margin: '30px 0 10px' }}>
              Live songs ({approved.length})
            </h2>
            <div className="cards-grid">
              {approved.map((song) => (
                <div key={song.id} className="card">
                  <div className="card-img"><i className="fas fa-music"></i></div>
                  <div className="card-title">{song.title}</div>
                  <div className="card-desc">{song.artist}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
