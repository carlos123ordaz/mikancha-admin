import { useState, useEffect, CSSProperties } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
}

/* ─── Icons ─── */
const ICO = (path: React.ReactNode, sw = 1.6) =>
  (s = 18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, display: 'block' }}>
      {path}
    </svg>
  );

const Icons = {
  dashboard: ICO(<><rect x="3" y="3" width="7" height="9" rx="1.2"/><rect x="14" y="3" width="7" height="5" rx="1.2"/><rect x="14" y="12" width="7" height="9" rx="1.2"/><rect x="3" y="16" width="7" height="5" rx="1.2"/></>),
  calendar:  ICO(<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>),
  field:     ICO(<><rect x="2.5" y="6" width="19" height="12" rx="1.5"/><path d="M12 6v12M2.5 12H6a3 3 0 0 0 0-6M21.5 12H18a3 3 0 0 1 0-6M2.5 12H6a3 3 0 0 1 0 6M21.5 12H18a3 3 0 0 0 0 6"/></>),
  qr:        ICO(<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v3M14 18v3h3M18 18v3M21 18v3"/></>),
  search:    ICO(<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>),
  bell:      ICO(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0"/></>),
  logout:    ICO(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></>),
  menu:      ICO(<><path d="M3 6h18M3 12h18M3 18h18"/></>),
  x:         ICO(<><path d="M6 6l12 12M18 6 6 18"/></>),
};

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: Icons.dashboard },
  { to: '/reservas',  label: 'Reservas',  icon: Icons.calendar,  badge: 0 },
  { to: '/canchas',   label: 'Canchas',   icon: Icons.field },
  { to: '/validar',   label: 'Validar QR', icon: Icons.qr },
];

const PAGE_TITLES: Record<string, { t: string; s: string }> = {
  '/dashboard': { t: 'Dashboard',      s: 'Resumen del día' },
  '/canchas':   { t: 'Canchas',        s: 'Gestiona tu inventario de espacios' },
  '/reservas':  { t: 'Reservas',       s: 'Aprueba o rechaza reservas pendientes' },
  '/validar':   { t: 'Validar QR',     s: 'Escanea el código de la reserva' },
};

function getHead(pathname: string) {
  for (const [path, info] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path)) return info;
  }
  return { t: 'Mikancha', s: '' };
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  const hue = (name.charCodeAt(0) * 17 + (name.charCodeAt(1) || 0) * 7) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `oklch(0.5 0.06 ${hue})`, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 600, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'var(--accent)', color: 'var(--accent-fg)',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <circle cx="12" cy="12" r="9"/>
          <path d="M3 12h18M12 3v18" strokeWidth="1.5" opacity="0.5"/>
        </svg>
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Mikancha</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--fg-faint)', letterSpacing: 0.4 }}>admin · v2</div>
      </div>
    </div>
  );
}

function NavItem({
  to, label, icon, badge, active, onClick,
}: {
  to: string; label: string; icon: (s: number) => JSX.Element;
  badge?: number; active: boolean; onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const bg = active
    ? 'var(--accent-soft-strong)'
    : hovered ? 'var(--bg-hover)' : 'transparent';
  const color = active ? 'var(--accent)' : 'var(--fg-muted)';

  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 8,
        background: bg, color,
        textDecoration: 'none', fontSize: 13.5,
        fontWeight: active ? 500 : 400,
        transition: 'all 100ms', width: '100%',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {icon(17)}
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && badge > 0 && (
        <span className="mono" style={{
          fontSize: 10, padding: '1px 6px', borderRadius: 999,
          background: active ? 'var(--accent)' : 'var(--warn)',
          color: active ? 'var(--accent-fg)' : 'var(--bg)',
          fontWeight: 600,
        }}>{badge}</span>
      )}
    </Link>
  );
}

function Sidebar({ onNavigate, user, onLogout }: {
  onNavigate?: () => void;
  user?: { name?: string; email?: string } | null;
  onLogout: () => void;
}) {
  const { pathname } = useLocation();
  const displayName = user?.name || user?.email || 'Admin';

  return (
    <div style={{
      background: 'var(--bg-elev)', borderRight: '1px solid var(--border)',
      padding: '18px 12px', display: 'flex', flexDirection: 'column', gap: 4,
      height: '100%',
    }}>
      <div style={{
        padding: '4px 8px 18px',
        borderBottom: '1px solid var(--border)',
        marginBottom: 14,
      }}>
        <Link to="/dashboard" onClick={onNavigate} style={{ textDecoration: 'none' }}>
          <Logo />
        </Link>
      </div>

      <div style={{
        fontSize: 10, color: 'var(--fg-faint)',
        textTransform: 'uppercase', letterSpacing: 0.8,
        padding: '10px 10px 6px', fontWeight: 600,
      }}>
        Operación
      </div>

      {NAV_ITEMS.map(item => {
        const active = pathname === item.to || pathname.startsWith(item.to + '/');
        return (
          <NavItem
            key={item.to}
            {...item}
            active={active}
            onClick={onNavigate}
          />
        );
      })}

      <div style={{ flex: 1 }} />

      <div style={{
        padding: 8, borderTop: '1px solid var(--border)', marginTop: 8,
        display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <Avatar name={displayName} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}>
            {user?.name || 'Admin'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-faint)' }}>Administrador</div>
        </div>
        <button
          onClick={onLogout}
          title="Cerrar sesión"
          style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--fg-faint)', display: 'grid', placeItems: 'center',
            cursor: 'pointer', flexShrink: 0,
            transition: 'all 120ms',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--danger)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-faint)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
          }}
        >
          {Icons.logout(14)}
        </button>
      </div>
    </div>
  );
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const head = getHead(pathname);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  function handleLogout() {
    localStorage.removeItem('auth_token');
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar desktop */}
      <aside
        className="hidden lg:block"
        style={{ width: 232, flexShrink: 0, position: 'sticky', top: 0, height: '100vh', alignSelf: 'flex-start' }}
      >
        <Sidebar user={user} onLogout={handleLogout} />
      </aside>

      {/* Drawer móvil */}
      {drawerOpen && (
        <>
          <div
            className="lg:hidden"
            onClick={() => setDrawerOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              zIndex: 40,
            }}
          />
          <aside
            className="lg:hidden animate-slide-in-right"
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0,
              width: 260, zIndex: 50,
            }}
          >
            <button
              onClick={() => setDrawerOpen(false)}
              style={{
                position: 'absolute', top: 12, right: 12,
                width: 28, height: 28, borderRadius: 6,
                background: 'var(--bg-elev-2)',
                border: '1px solid var(--border)',
                color: 'var(--fg-muted)',
                display: 'grid', placeItems: 'center',
                cursor: 'pointer', zIndex: 10,
              }}
            >
              {Icons.x(14)}
            </button>
            <Sidebar user={user} onNavigate={() => setDrawerOpen(false)} onLogout={handleLogout} />
          </aside>
        </>
      )}

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <header style={{
          height: 60, borderBottom: '1px solid var(--border)',
          background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 30,
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '0 20px',
        }}>
          <button
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'var(--bg-elev)', border: '1px solid var(--border)',
              color: 'var(--fg-muted)', display: 'grid', placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            {Icons.menu(18)}
          </button>

          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 11, color: 'var(--fg-faint)',
              letterSpacing: 0.4, textTransform: 'uppercase', fontWeight: 500,
            }}>
              Mikancha · {head.s}
            </div>
            <div style={{
              fontSize: 18, fontWeight: 600,
              letterSpacing: '-0.02em', marginTop: 1,
            }}>
              {head.t}
            </div>
          </div>

          {/* Search */}
          <div className="hidden sm:flex topbar-search" style={{
            alignItems: 'center', gap: 8, height: 36, padding: '0 12px',
            background: 'var(--bg-elev)', border: '1px solid var(--border)',
            borderRadius: 8, width: 260,
          }}>
            <span style={{ color: 'var(--fg-faint)', flexShrink: 0 }}>{Icons.search(15)}</span>
            <input
              placeholder="Buscar reserva, cancha, cliente…"
              style={{
                border: 'none', background: 'transparent', outline: 'none',
                color: 'var(--fg)', fontSize: 13, flex: 1, width: 0,
              }}
            />
            <span className="mono" style={{
              fontSize: 10, padding: '1px 5px', borderRadius: 4,
              border: '1px solid var(--border)', color: 'var(--fg-faint)',
            }}>⌘K</span>
          </div>

          {/* Bell */}
          <button style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--bg-elev)', border: '1px solid var(--border)',
            color: 'var(--fg-muted)', display: 'grid', placeItems: 'center',
            cursor: 'pointer', position: 'relative', flexShrink: 0,
          }}>
            {Icons.bell(17)}
            <span style={{
              position: 'absolute', top: 8, right: 8,
              width: 7, height: 7, borderRadius: 999,
              background: 'var(--warn)', border: '2px solid var(--bg-elev)',
            }} />
          </button>
        </header>

        {/* Content */}
        <div className="content-pad animate-fade-in" style={{ flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
