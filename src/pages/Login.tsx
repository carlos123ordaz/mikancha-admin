const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Login() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '40px 16px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '-160px', right: '-160px',
        width: 400, height: 400,
        background: 'var(--accent-soft)', borderRadius: '50%',
        filter: 'blur(80px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-160px', left: '-160px',
        width: 400, height: 400,
        background: 'var(--info-soft)', borderRadius: '50%',
        filter: 'blur(80px)', pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative' }}>
        <div className="card animate-fade-in" style={{ padding: '40px 36px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'var(--accent)', color: 'var(--accent-fg)',
              display: 'grid', placeItems: 'center', marginBottom: 16,
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="12" cy="12" r="9"/>
                <path d="M3 12h18M12 3v18" strokeWidth="1.5" opacity="0.6"/>
              </svg>
            </div>
            <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}>Mikancha</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--fg-faint)', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 4 }}>
              Panel de administración
            </div>
          </div>

          {/* Welcome */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Bienvenido de vuelta</div>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
              Inicia sesión para gestionar reservas y canchas
            </div>
          </div>

          {/* Google button */}
          <a
            href={`${API_URL}/api/auth/google`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              width: '100%', background: 'var(--bg-elev-2)',
              border: '1px solid var(--border)', color: 'var(--fg)',
              padding: '11px 20px', borderRadius: 10,
              fontWeight: 500, fontSize: 14, textDecoration: 'none',
              transition: 'all 120ms', cursor: 'pointer',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border-strong)'; (e.currentTarget as HTMLAnchorElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLAnchorElement).style.background = 'var(--bg-elev-2)'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar con Google
          </a>

          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--fg-faint)', marginTop: 20 }}>
            Al continuar, aceptas los términos de uso del panel.
          </p>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--fg-faint)', marginTop: 20 }}>
          © {new Date().getFullYear()} Mikancha · Panel de administración
        </p>
      </div>
    </div>
  );
}
