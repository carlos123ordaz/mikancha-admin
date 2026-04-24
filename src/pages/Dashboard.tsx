import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

interface Stats {
  reservationsToday: number;
  pendingCount: number;
  activeCourts: number;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  to?: string;
}

function StatCard({ label, value, icon, color, to }: StatCardProps) {
  const inner = (
    <div className={`bg-white rounded-2xl p-6 shadow-sm flex items-center gap-5 ${to ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : <div>{inner}</div>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ success: boolean; data: Stats }>('/api/admin/stats')
      .then((res) => setStats(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-400 text-sm capitalize">{today}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-gray-100 rounded-xl" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-24" />
                  <div className="h-7 bg-gray-100 rounded w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <StatCard
            label="Reservas hoy"
            value={stats?.reservationsToday ?? 0}
            icon="📅"
            color="bg-blue-50 text-blue-700"
            to="/reservas"
          />
          <StatCard
            label="Pendientes de aprobación"
            value={stats?.pendingCount ?? 0}
            icon="⏳"
            color="bg-yellow-50 text-yellow-700"
            to="/reservas"
          />
          <StatCard
            label="Canchas activas"
            value={stats?.activeCourts ?? 0}
            icon="⚽"
            color="bg-green-50 text-green-700"
            to="/canchas"
          />
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/reservas"
          className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center text-xl">
            📋
          </div>
          <div>
            <p className="font-semibold text-gray-900">Revisar reservas</p>
            <p className="text-sm text-gray-400">Ver pendientes y aprobar comprobantes</p>
          </div>
        </Link>

        <Link
          to="/validar"
          className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-xl">
            📷
          </div>
          <div>
            <p className="font-semibold text-gray-900">Validar QR</p>
            <p className="text-sm text-gray-400">Escanear QR al ingreso de la cancha</p>
          </div>
        </Link>

        <Link
          to="/canchas"
          className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-xl">
            ⚽
          </div>
          <div>
            <p className="font-semibold text-gray-900">Gestionar canchas</p>
            <p className="text-sm text-gray-400">Crear, editar precios y horarios</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
