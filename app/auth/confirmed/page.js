'use client';

export default function ConfirmedPage() {
  return (
    <div className="auth-wrapper">
      <div className="auth-card">
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
      </div>
    </div>
  );
}
