'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Navbar from '../../components/Navbar';

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminId, setAdminId] = useState(null);
  const [pending, setPending] = useState([]);
  const [deleteRequests, setDeleteRequests] = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading, setLoading] = useState(true);

  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceBody, setAnnounceBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [announceMsg, setAnnounceMsg] = useState('');

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
      setAdminId(sessionData.session.user.id);
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

  const postAnnouncement = async () => {
    if (!announceTitle.trim()) return;
    setPosting(true);
    setAnnounceMsg('');

    const { error } = await supabase.from('inbox_posts').insert({
      type: 'announcement',
      title: announceTitle.trim(),
      body: announceBody.trim() || null,
      posted_by: adminId,
    });

    setPosting(false);

    if (error) {
      setAnnounceMsg('Failed to post: ' + error.message);
    } else {
      setAnnounceMsg('Posted to everyone\'s inbox.');
      setAnnounceTitle('');
      setAnnounceBody('');
    }
  };

  if (checking || !isAdmin) return null;

  return (
    <>
      <Navbar />
      <div className="content-area">
        <h1 className="section-title">Admin review</h1>

        <h2 style={{ fontSize: '18px', margin: '10px 0 10px' }}>Post an announcement</h2>
        <div className="upload-card" style={{ marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Announcement title"
            value={announceTitle}
            onChange={(e) => setAnnounceTitle(e.target.value)}
          />
          <textarea
            placeholder="Details (optional)"
            value={announceBody}
            onChange={(e) => setAnnounceBody(e.target.value)}
            style={{
              width: '100%',
              minHeight: '70px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--text)',
              fontSize: '14px',
              marginBottom: '15px',
              fontFamily: 'var(--font-body)',
            }}
          />
          {announceMsg && (
            <div className="error-msg" style={{ background: 'rgba(47,209,197,0.12)', color: 'var(--accent-2)' }}>
              {announceMsg}
            </div>
          )}
          <button className="btn btn-primary" onClick={postAnnouncement} disabled={posting} style={{ width: '100%', padding: '12px', borderRadius: '999px' }}>
            {posting ? 'Posting...' : 'Post to everyone'}
          </button>
        </div>

        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}

        {!loading && (
          <>
            <h2 style={{ fontSize: '18px', margin: '30px 0 10px' }}>
              Pending uploads ({pending.length})
            </h2>
            {pending.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nothing pending.</p>}
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
            {deleteRequests.length === 0 && <p style={{ color: 'var(--text-muted)' }}>None right now.</p>}
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
