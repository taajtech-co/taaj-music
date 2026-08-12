'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Navbar from '../../components/Navbar';

const GENRES = [
  'Afrobeats', 'Hip-Hop', 'R&B', 'Pop', 'Gospel', 'Amapiano',
  'Dancehall', 'Rock', 'Electronic', 'Country', 'Jazz', 'Other',
];

export default function UploadPage() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [genre, setGenre] = useState('');
  const [file, setFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
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
    if (coverFile && !coverFile.type.startsWith('image/')) {
      setError('Cover art must be an image file.');
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

    let coverPath = null;
    if (coverFile) {
      const coverExt = coverFile.name.split('.').pop();
      coverPath = `${session.user.id}/${Date.now()}-cover.${coverExt}`;
      const { error: coverError } = await supabase.storage
        .from('covers')
        .upload(coverPath, coverFile);
      if (coverError) {
        setError(coverError.message);
        setUploading(false);
        return;
      }
    }

    const { error: insertError } = await supabase.from('songs').insert({
      title,
      artist,
      genre: genre || null,
      storage_path: filePath,
      cover_path: coverPath,
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
    setGenre('');
    setFile(null);
    setCoverFile(null);
    setUploading(false);
  };

  if (checking) return null;

  return (
    <>
      <Navbar />
      <div className="content-area">
        <h1 className="section-title">Upload a song</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
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

          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Genre
          </label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            style={{
              width: '100%',
              padding: '11px 13px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--text)',
              marginBottom: '15px',
              fontSize: '14px',
            }}
          >
            <option value="">Select a genre (optional)</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            Audio file
          </label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files[0])}
            required
          />

          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', marginTop: '10px' }}>
            Cover art (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCoverFile(e.target.files[0])}
          />

          {error && <div className="error-msg">{error}</div>}
          {success && (
            <div className="error-msg" style={{ background: 'rgba(47,209,197,0.12)', color: 'var(--accent-2)' }}>
              {success}
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={uploading} style={{ width: '100%', padding: '12px', borderRadius: '999px' }}>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      </div>
    </>
  );
    }
