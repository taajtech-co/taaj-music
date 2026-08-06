'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Navbar from '../../components/Navbar';

export default function UploadPage() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
      if (!data.session) window.location.href = '/login';
    });
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!file) {
      setError('Please choose an audio file.');
      return;
    }
    if (!file.type.startsWith('audio/')) {
      setError('Please upload an audio file (mp3, wav, m4a, etc).');
      return;
    }

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('songs')
      .upload(filePath, file);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from('songs').insert({
      title,
      artist,
      storage_path: filePath,
      uploader_id: session.user.id,
      status: 'pending',
    });

    if (insertError) {
      setError(insertError.message);
      setUploading(false);
      return;
    }

    setSuccess('Song submitted! It will appear once approved by an admin.');
    setTitle('');
    setArtist('');
    setFile(null);
    setUploading(false);
  };

  if (checking) return null;

  return (
    <>
      <Navbar />
      <div className="content-area">
        <h1 className="section-title">Upload a song</h1>
        <p style={{ color: 'var(--gray)', marginBottom: '20px' }}>
          Your song will be reviewed before it appears publicly.
        </p>
        <form className="upload-card" onSubmit={handleUpload}>
          <input
            type="text"
            placeholder="Song title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Artist name"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            required
          />
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files[0])}
            required
          />
          {error && <div className="error-msg">{error}</div>}
          {success && (
            <div className="error-msg" style={{ background: 'rgba(29,185,84,0.15)', color: 'var(--primary)' }}>
              {success}
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={uploading} style={{ width: '100%', padding: '12px', borderRadius: '20px' }}>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      </div>
    </>
  );
         }
