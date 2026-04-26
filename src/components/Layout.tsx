import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  to: string;
  label: string;
  icon: (props: { className?: string }) => JSX.Element;
}

/* ─────────────── SVG icons (uniformes, sin emojis) ─────────────── */
const IconDashboard = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);
const IconBall = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M5.6 5.6l2.5 2.5M15.9 15.9l2.5 2.5M5.6 18.4l2.5-2.5M15.9 8.1l2.5-2.5" />
  </svg>
);
const IconCalendar = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 3v4M16 3v4" />
  </svg>
);
const IconQr = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3M21 14v0M17 21h4M14 18v3" />
  </svg>
);
const IconLogout = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);
const IconMenu = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);
const IconClose = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { to: '/canchas', label: 'Canchas', icon: IconBall },
  { to: '/reservas', label: 'Reservas', icon: IconCalendar },
  { to: '/validar', label: 'Validar QR', icon: IconQr },
];

const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Resumen del día' },
  '/canchas': { title: 'Canchas', subtitle: 'Gestiona tus canchas y horarios' },
  '/reservas': { title: 'Reservas', subtitle: 'Aprobaciones y seguimiento' },
  '/validar': { title: 'Validar QR', subtitle: 'Acceso al ingresar a la cancha' },
};

function getPageTitle(pathname: string): { title: string; subtitle?: string } {
  for (const [path, info] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path)) return info;
  }
  return { title: '' };
}

function SidebarLink({
  to,
  label,
  icon: Icon,
  onClick,
}: NavItem & { onClick?: () => void }) {
  const { pathname } = useLocation();
  const active = pathname.startsWith(to);

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm ${
        active
          ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
      <span>{label}</span>
    </Link>
  );
}

function UserPill({ name, email, avatar }: { name?: string; email?: string; avatar?: string }) {
  const initials = (name ?? email ?? '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 min-w-0">
      {avatar ? (
        <img src={avatar} alt={name} className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center text-xs font-bold shadow-sm">
          {initials}
        </div>
      )}
      <div className="min-w-0 hidden sm:block">
        <p className="text-sm font-semibold text-slate-900 truncate">{name ?? 'Admin'}</p>
        <p className="text-xs text-slate-400 truncate">{email}</p>
      </div>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-100">
        <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-sm shadow-primary-500/30">
            <IconBall className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm leading-tight">MiCancha</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Panel admin</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        <p className="px-3 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          General
        </p>
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.to} {...item} onClick={onNavigate} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 pt-3 border-t border-slate-100">
        <div className="px-3 py-2 mb-2 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100/50 ring-1 ring-primary-100">
          <p className="text-[11px] font-semibold text-primary-800">¿Necesitas ayuda?</p>
          <p className="text-[10px] text-primary-700/80 mt-0.5">
            Revisa la documentación o contáctanos.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const page = getPageTitle(pathname);

  // Cierra el drawer al cambiar de ruta
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  function handleLogout() {
    localStorage.removeItem('auth_token');
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 flex-col flex-shrink-0 border-r border-slate-200/70 bg-white">
        <Sidebar />
      </aside>

      {/* Drawer móvil */}
      {drawerOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="lg:hidden fixed top-0 left-0 bottom-0 w-72 z-50 shadow-2xl animate-slide-in-right">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 z-10"
              aria-label="Cerrar menú"
            >
              <IconClose className="w-5 h-5" />
            </button>
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200/70">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                aria-label="Abrir menú"
              >
                <IconMenu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">{page.title}</h1>
                {page.subtitle && (
                  <p className="text-xs text-slate-400 truncate hidden sm:block">{page.subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <UserPill name={user?.name} email={user?.email} avatar={user?.avatar} />
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-2 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                aria-label="Cerrar sesión"
              >
                <IconLogout className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
