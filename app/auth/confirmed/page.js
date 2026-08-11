'use client';

import { useEffect, useState } from 'react';

export default function ConfirmedPage() {
  const [status, setStatus] = useState('checking'); // checking | success | error
  const [errorDetail, setErrorDetail] = useState('');

  useEffect(() => {
    const hash = window.location.hash?.replace('#', '');
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(window.location.search);

    const err = hashParams.get('error') || searchParams.get('error');
    const errDesc = hashParams.get('error_description') || searchParams.get('error_description');

    if (err) {
      setStatus('error');
      setErrorDetail(errDesc ? decodeURIComponent(errDesc.replace(/\+/g, ' ')) : err);
    } else {
      setStatus('success');
    }
  }, []);

  if (status === 'checking') return null;

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {status === 'success' ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <i className="fas fa-circle-check" style={{ fontSize: '40px', color: 'var(--accent-2)' }}></i>
            </div>
            <h1>Account confirmed!</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '10px' }}>
              Your email has been verified. You can now log in to Taaj Music.
            </p>
            <a
              href="/login"
              className="btn btn-primary"
              style={{ display: 'block', textAlign: 'center', marginTop: '24px', padding: '12px', borderRadius: '999px' }}
            >
              Log in
            </a>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <i className="fas fa-circle-exclamation" style={{ fontSize: '40px', color: '#E5484D' }}></i>
            </div>
            <h1>Confirmation failed</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '10px' }}>
              {errorDetail || 'This link may have expired or already been used.'}
            </p>
            <a
              href="/signup"
              className="btn btn-primary"
              style={{ display: 'block', textAlign: 'center', marginTop: '24px', padding: '12px', borderRadius: '999px' }}
            >
              Try signing up again
            </a>
          </>
        )}
      </div>
    </div>
  );
}
