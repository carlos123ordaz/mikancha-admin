import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import type { IReservation, ICourt, IUser } from '../types';

interface Stats {
  reservationsToday: number;
  pendingCount: number;
  activeCourts: number;
}

type PopulatedReservation = Omit<IReservation, 'userId' | 'courtId'> & {
  userId: IUser;
  courtId: ICourt;
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  used: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  used: 'Usada',
};

/* ─────────────── Iconos ─────────────── */
const IconCal = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" />
  </svg>
);
const IconClock = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
  </svg>
);
const IconBall = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <circle cx="12" cy="12" r="9" /><path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21" />
  </svg>
);
const IconQr = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M21 14v0M17 21h4M14 18v3" />
  </svg>
);
const IconArrow = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: (p: { className?: string }) => JSX.Element;
  iconBg: string;
  iconText: string;
  to?: string;
}

function StatCard({ label, value, hint, icon: Icon, iconBg, iconText, to }: StatCardProps) {
  const inner = (
    <div className="card p-5 sm:p-6 group hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconText}`} />
        </div>
        {to && (
          <IconArrow className="w-4 h-4 text-slate-300 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
        )}
      </div>
      <p className="text-3xl font-bold text-slate-900 leading-tight tracking-tight">{value}</p>
      <p className="text-sm text-slate-500 mt-1 font-medium">{label}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : <div>{inner}</div>;
}

function QuickAction({
  to,
  icon: Icon,
  label,
  description,
  iconBg,
  iconText,
}: {
  to: string;
  icon: (p: { className?: string }) => JSX.Element;
  label: string;
  description: string;
  iconBg: string;
  iconText: string;
}) {
  return (
    <Link to={to} className="card p-4 sm:p-5 flex items-center gap-4 hover:shadow-card-hover transition-all group">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconText}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900">{label}</p>
        <p className="text-sm text-slate-500 truncate">{description}</p>
      </div>
      <IconArrow className="w-4 h-4 text-slate-300 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<PopulatedReservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ success: boolean; data: Stats }>('/api/admin/stats'),
      api.get<{ success: boolean; data: { reservations: PopulatedReservation[] } }>(
        '/api/admin/reservations?limit=5'
      ),
    ])
      .then(([s, r]) => {
        setStats(s.data.data);
        setRecent(r.data.data.reservations);
      })
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
    <div className="space-y-6 lg:space-y-8">
      {/* Greeting */}
      <header>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">¡Hola de nuevo!</h2>
        <p className="text-slate-500 text-sm mt-1 capitalize">{today}</p>
      </header>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="w-11 h-11 bg-slate-100 rounded-xl mb-4" />
              <div className="h-8 bg-slate-100 rounded w-16 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-32" />
            </div>
          ))}
        </div>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          <StatCard
            label="Reservas hoy"
            value={stats?.reservationsToday ?? 0}
            hint="Total programadas para hoy"
            icon={IconCal}
            iconBg="bg-blue-50"
            iconText="text-blue-600"
            to="/reservas"
          />
          <StatCard
            label="Pendientes"
            value={stats?.pendingCount ?? 0}
            hint="Esperando aprobación"
            icon={IconClock}
            iconBg="bg-amber-50"
            iconText="text-amber-600"
            to="/reservas"
          />
          <StatCard
            label="Canchas activas"
            value={stats?.activeCourts ?? 0}
            hint="Disponibles para reservar"
            icon={IconBall}
            iconBg="bg-emerald-50"
            iconText="text-emerald-600"
            to="/canchas"
          />
        </section>
      )}

      {/* Two columns: recent + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
        {/* Recientes */}
        <section className="lg:col-span-2 card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Reservas recientes</h3>
              <p className="text-xs text-slate-400 mt-0.5">Últimas {recent.length} solicitudes</p>
            </div>
            <Link
              to="/reservas"
              className="text-xs font-semibold text-primary-700 hover:text-primary-800 flex items-center gap-1"
            >
              Ver todas
              <IconArrow className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-400">
              Aún no hay reservas registradas.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recent.map((r) => (
                <div key={r._id} className="py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <IconCal className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-slate-900 truncate">
                        {r.courtId?.name ?? '—'}
                      </p>
                      <span className={`badge ${STATUS_BADGE[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {r.userId?.name ?? '—'} · {r.date} · {r.startTime}–{r.endTime}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 hidden sm:inline">
                    {r.reservationCode}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-slate-900">Accesos rápidos</h3>
          <QuickAction
            to="/reservas"
            label="Revisar pendientes"
            description="Aprueba comprobantes"
            icon={IconClock}
            iconBg="bg-amber-50"
            iconText="text-amber-600"
          />
          <QuickAction
            to="/validar"
            label="Validar QR"
            description="Acceso a la cancha"
            icon={IconQr}
            iconBg="bg-emerald-50"
            iconText="text-emerald-600"
          />
          <QuickAction
            to="/canchas"
            label="Gestionar canchas"
            description="Precios y horarios"
            icon={IconBall}
            iconBg="bg-blue-50"
            iconText="text-blue-600"
          />
        </section>
      </div>
    </div>
  );
}
