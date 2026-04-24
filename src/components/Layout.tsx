import { Link, useLocation, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/canchas', icon: '⚽', label: 'Canchas' },
  { to: '/reservas', icon: '📅', label: 'Reservas' },
  { to: '/validar', icon: '📷', label: 'Validar QR' },
];

function SidebarLink({ to, icon, label }: NavItem) {
  const { pathname } = useLocation();
  const active = pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm ${
        active
          ? 'bg-primary-50 text-primary-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span className="text-base">{icon}</span>
      {label}
    </Link>
  );
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem('auth_token');
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-gray-100">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">⚽</span>
            <span className="font-bold text-gray-900 text-sm">micancha</span>
          </Link>
          <p className="text-xs text-gray-400 mt-0.5 ml-8">Panel Admin</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <span>🚪</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 overflow-y-auto">
        <main className="p-8 max-w-6xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
