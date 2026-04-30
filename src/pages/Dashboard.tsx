import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  calendar: ICO(<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>),
  flash:    ICO(<><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></>),
  field:    ICO(<><rect x="2.5" y="6" width="19" height="12" rx="1.5"/><path d="M12 6v12M2.5 12H6a3 3 0 0 0 0-6M21.5 12H18a3 3 0 0 1 0-6"/></>),
  qr:       ICO(<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v3M14 18v3h3M18 18v3M21 18v3"/></>),
  plus:     ICO(<><path d="M12 5v14M5 12h14"/></>, 1.8),
  trend:    ICO(<><path d="M3 17l6-6 4 4 8-8M14 7h7v7"/></>),
  chevR:    ICO(<><path d="m9 6 6 6-6 6"/></>),
  arrR:     ICO(<><path d="M5 12h14M13 6l6 6-6 6"/></>),
};

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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    pending:  { bg: 'var(--warn-soft)',         fg: 'var(--warn)',   label: 'Pendiente' },
    approved: { bg: 'var(--accent-soft-strong)', fg: 'var(--accent)', label: 'Aprobada' },
    rejected: { bg: 'var(--danger-soft)',        fg: 'var(--danger)', label: 'Rechazada' },
    used:     { bg: 'var(--info-soft)',          fg: 'var(--info)',   label: 'Usada' },
  };
  const s = map[status] ?? { bg: 'var(--bg-elev-2)', fg: 'var(--fg-faint)', label: status };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '2px 8px', borderRadius: 999,
      background: s.bg, color: s.fg,
      fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.fg }} />
      {s.label}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ width: 100, height: 13, borderRadius: 4, background: 'var(--bg-elev-2)' }} />
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-elev-2)' }} />
      </div>
      <div style={{ width: 64, height: 38, borderRadius: 4, background: 'var(--bg-elev-2)', marginTop: 14 }} />
      <div style={{ width: 80, height: 11, borderRadius: 4, background: 'var(--bg-elev-2)', marginTop: 8 }} />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  delta: string;
  icon: (s: number) => JSX.Element;
  warn?: boolean;
}

function StatCard({ label, value, delta, icon, warn = false }: StatCardProps) {
  return (
    <div className="card" style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
      {warn && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'var(--warn)',
        }} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', fontWeight: 500 }}>{label}</div>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: warn ? 'var(--warn-soft)' : 'var(--accent-soft)',
          color: warn ? 'var(--warn)' : 'var(--accent)',
          display: 'grid', placeItems: 'center',
        }}>
          {icon(16)}
        </div>
      </div>
      <div className="mono" style={{
        fontSize: 38, fontWeight: 600,
        letterSpacing: '-0.03em', marginTop: 14, lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 12, color: warn ? 'var(--warn)' : 'var(--fg-faint)',
        marginTop: 8, display: 'flex', alignItems: 'center', gap: 5,
      }}>
        {!warn && Icons.trend(13)}
        {delta}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<PopulatedReservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ success: boolean; data: Stats }>('/api/admin/stats'),
      api.get<{ success: boolean; data: { reservations: PopulatedReservation[] } }>(
        '/api/admin/reservations?limit=6'
      ),
    ])
      .then(([s, r]) => {
        setStats(s.data.data);
        setRecent(r.data.data.reservations);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const pendientes = recent.filter(r => r.status === 'pending');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Stats */}
      <div className="grid-stats">
        {loading ? (
          [1, 2, 3].map(i => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              label="Reservas hoy"
              value={stats?.reservationsToday ?? 0}
              delta="+12% vs ayer"
              icon={Icons.calendar}
            />
            <StatCard
              label="Pendientes de aprobar"
              value={stats?.pendingCount ?? 0}
              delta="Acción requerida"
              icon={Icons.flash}
              warn={(stats?.pendingCount ?? 0) > 0}
            />
            <StatCard
              label="Canchas activas"
              value={stats?.activeCourts ?? 0}
              delta="Disponibles para reservar"
              icon={Icons.field}
            />
          </>
        )}
      </div>

      {/* Two columns */}
      <div className="grid-two-col">
        {/* Últimas reservas */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Últimas reservas</div>
              <div style={{ fontSize: 12, color: 'var(--fg-faint)', marginTop: 2 }}>
                Movimientos de las últimas 24 horas
              </div>
            </div>
            <Link to="/reservas" className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
              Ver todas {Icons.arrR(13)}
            </Link>
          </div>
          <div>
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} style={{ padding: '12px 20px', display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-elev-2)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ width: 120, height: 12, borderRadius: 4, background: 'var(--bg-elev-2)', marginBottom: 6 }} />
                    <div style={{ width: 160, height: 11, borderRadius: 4, background: 'var(--bg-elev-2)' }} />
                  </div>
                </div>
              ))
            ) : recent.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--fg-faint)', fontSize: 13 }}>
                Aún no hay reservas registradas.
              </div>
            ) : (
              recent.map((r, i) => (
                <RecentRow key={r._id} r={r} last={i === recent.length - 1} onClick={() => navigate('/reservas')} />
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Pending alert */}
          {(stats?.pendingCount ?? 0) > 0 && (
            <div className="card" style={{
              padding: 0,
              background: 'var(--warn-soft)',
              borderColor: 'color-mix(in oklch, var(--warn), transparent 70%)',
            }}>
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--warn)' }}>{Icons.flash(16)}</span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--warn)' }}>
                    {stats?.pendingCount} reserva{stats?.pendingCount === 1 ? '' : 's'} pendiente{stats?.pendingCount === 1 ? '' : 's'}
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--fg-muted)', marginTop: 8, lineHeight: 1.5 }}>
                  Tus clientes están esperando confirmación.
                </div>
                <div style={{ marginTop: 14 }}>
                  <Link to="/reservas" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                    Revisar pendientes
                  </Link>
                </div>
              </div>
              {pendientes.length > 0 && (
                <div style={{ borderTop: '1px solid color-mix(in oklch, var(--warn), transparent 80%)' }}>
                  {pendientes.map((r, i) => (
                    <div key={r._id} style={{
                      padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10,
                      borderTop: i > 0 ? '1px solid color-mix(in oklch, var(--warn), transparent 85%)' : 'none',
                      fontSize: 12.5,
                    }}>
                      <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-faint)' }}>
                        {r.reservationCode}
                      </span>
                      <span style={{ flex: 1, color: 'var(--fg)', fontWeight: 500 }}>
                        {r.userId?.name || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Accesos rápidos</div>
            </div>
            <div style={{ padding: 12, display: 'grid', gap: 4 }}>
              {[
                { icon: Icons.plus,  label: 'Nueva cancha',     sub: 'Agrega una cancha al inventario', to: '/canchas/nueva' },
                { icon: Icons.qr,    label: 'Validar QR',       sub: 'Escanea el código del cliente',   to: '/validar' },
                { icon: Icons.field, label: 'Ver canchas',      sub: 'Gestiona horarios y precios',     to: '/canchas' },
              ].map(a => (
                <QuickAction key={a.label} {...a} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentRow({
  r, last, onClick,
}: {
  r: PopulatedReservation; last: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const name = r.userId?.name || '—';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 14,
        padding: '12px 20px', alignItems: 'center',
        borderBottom: last ? 'none' : '1px solid var(--border)',
        cursor: 'pointer', transition: 'background 100ms',
        background: hovered ? 'var(--bg-hover)' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Avatar name={name} size={32} />
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {name}
          <span className="mono" style={{ fontSize: 10, color: 'var(--fg-faint)' }}>
            {r.reservationCode}
          </span>
        </div>
        <div style={{
          fontSize: 12, color: 'var(--fg-muted)', marginTop: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {r.courtId?.name || '—'} · {r.date} · {r.startTime}
        </div>
      </div>
      <div className="mono" style={{ fontSize: 13, fontWeight: 500, textAlign: 'right' }}>
        S/ {r.courtId?.pricePerHour ?? '—'}
      </div>
      <StatusBadge status={r.status} />
    </div>
  );
}

function QuickAction({ icon, label, sub, to }: {
  icon: (s: number) => JSX.Element; label: string; sub: string; to: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={to}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px', borderRadius: 8,
        textDecoration: 'none',
        background: hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 100ms',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 8,
        background: 'var(--accent-soft)', color: 'var(--accent)',
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        {icon(16)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--fg-faint)', marginTop: 1 }}>{sub}</div>
      </div>
      <span style={{ color: 'var(--fg-faint)', flexShrink: 0 }}>{Icons.chevR(15)}</span>
    </Link>
  );
}
