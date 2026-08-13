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

  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [pollMsg, setPollMsg] = useState('');

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

  const updatePollOption = (index, value) => {
    setPollOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const addPollOption = () => {
    if (pollOptions.length >= 6) return;
    setPollOptions((prev) => [...prev, '']);
  };

  const removePollOption = (index) => {
    if (pollOptions.length <= 2) return;
    setPollOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const createPoll = async () => {
    const cleanOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!pollQuestion.trim() || cleanOptions.length < 2) {
      setPollMsg('Add a question and at least 2 options.');
      return;
    }

    setCreatingPoll(true);
    setPollMsg('');

    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert({ question: pollQuestion.trim(), created_by: adminId })
      .select()
      .single();

    if (pollError || !poll) {
      setPollMsg('Failed to create poll: ' + (pollError?.message || 'unknown error'));
      setCreatingPoll(false);
      return;
    }

    const { error: optionsError } = await supabase
      .from('poll_options')
      .insert(cleanOptions.map((text) => ({ poll_id: poll.id, option_text: text })));

    setCreatingPoll(false);

    if (optionsError) {
      setPollMsg('Poll created but options failed: ' + optionsError.message);
    } else {
      setPollMsg('Poll posted to Hub.');
      setPollQuestion('');
      setPollOptions(['', '']);
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
              width: '100%', minHeight: '70px', padding: '10px 12px', borderRadius: '8px',
              border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)',
              fontSize: '14px', marginBottom: '15px', fontFamily: 'var(--font-body)',
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

        <h2 style={{ fontSize: '18px', margin: '30px 0 10px' }}>Create a poll</h2>
        <div className="upload-card" style={{ marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Poll question"
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
          />
          {pollOptions.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input
                type="text"
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={(e) => updatePollOption(i, e.target.value)}
                style={{ flex: 1 }}
              />
              {pollOptions.length > 2 && (
                <button
                  onClick={() => removePollOption(i)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '16px', cursor: 'pointer' }}
                >
                  <i className="fas fa-trash"></i>
                </button>
              )}
            </div>
          ))}
          {pollOptions.length < 6 && (
            <button className="btn btn-outline" onClick={addPollOption} style={{ marginBottom: '15px', fontSize: '13px' }}>
              + Add option
            </button>
          )}
          {pollMsg && (
            <div className="error-msg" style={{ background: 'rgba(47,209,197,0.12)', color: 'var(--accent-2)' }}>
              {pollMsg}
            </div>
          )}
          <button className="btn btn-primary" onClick={createPoll} disabled={creatingPoll} style={{ width: '100%', padding: '12px', borderRadius: '999px' }}>
            {creatingPoll ? 'Creating...' : 'Post poll to Hub'}
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
