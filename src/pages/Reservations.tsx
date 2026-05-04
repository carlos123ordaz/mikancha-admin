import { useState, useEffect, useCallback } from 'react';
import type { IReservation, ICourt, IUser } from '../types';
import api from '../lib/api';

type PopulatedReservation = Omit<IReservation, 'userId' | 'courtId'> & {
  userId: IUser;
  courtId: ICourt;
};

const LIMIT = 25;

const STATUS_TABS = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'used', label: 'Usadas' },
];


const STATUS_MAP: Record<string, { bg: string; fg: string; label: string }> = {
  pending: { bg: 'var(--warn-soft)', fg: 'var(--warn)', label: 'Pendiente' },
  approved: { bg: 'var(--accent-soft-strong)', fg: 'var(--accent)', label: 'Aprobada' },
  rejected: { bg: 'var(--danger-soft)', fg: 'var(--danger)', label: 'Rechazada' },
  used: { bg: 'var(--info-soft)', fg: 'var(--info)', label: 'Usada' },
};

const PAYMENT_LABEL: Record<string, string> = {
  yape: 'Yape',
  transfer: 'Transferencia',
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
  refresh: ICO(<><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5" /></>),
  search: ICO(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  check: ICO(<><path d="m5 12 5 5L20 7" /></>, 2),
  x: ICO(<><path d="M6 6l12 12M18 6 6 18" /></>, 2),
  eye: ICO(<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>),
  chevLeft: ICO(<><path d="m15 18-6-6 6-6" /></>),
  chevRight: ICO(<><path d="m9 18 6-6-6-6" /></>),
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { bg: 'var(--bg-elev-2)', fg: 'var(--fg-faint)', label: status };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999,
      background: s.bg, color: s.fg,
      fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.fg }} />
      {s.label}
    </span>
  );
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

/* ─── Pagination ─── */
function Pagination({
  page, total, limit, onChange,
}: {
  page: number; total: number; limit: number; onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 10,
      padding: '12px 16px',
      borderTop: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--fg-faint)' }}>
        Mostrando {from}–{to} de {total}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="btn-ghost"
          style={{ height: 30, padding: '0 8px' }}
          title="Página anterior"
        >
          {Icons.chevLeft(15)}
        </button>
        <span style={{ fontSize: 12, color: 'var(--fg-muted)', padding: '0 4px', minWidth: 80, textAlign: 'center' }}>
          Página {page} de {totalPages}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="btn-ghost"
          style={{ height: 30, padding: '0 8px' }}
          title="Página siguiente"
        >
          {Icons.chevRight(15)}
        </button>
      </div>
    </div>
  );
}

/* ─── Modal ─── */
function ReservationModal({
  reservation, onClose, onApprove, onReject, loading,
}: {
  reservation: PopulatedReservation;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, padding: 16,
      }}
      className="animate-fade-in"
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-elev)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: 'var(--shadow-lg)',
          maxWidth: 480, width: '100%',
          maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0,
          background: 'var(--bg-elev)',
          borderBottom: '1px solid var(--border)',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span className="mono" style={{ fontSize: 13, color: 'var(--fg-faint)', flex: 1 }}>
            {reservation.reservationCode}
          </span>
          <StatusBadge status={reservation.status} />
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'var(--bg-elev-2)', border: '1px solid var(--border)',
              color: 'var(--fg-muted)', display: 'grid', placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            {Icons.x(14)}
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Client info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Avatar name={reservation.userId?.name || '?'} size={44} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{reservation.userId?.name || '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{reservation.userId?.email || '—'}</div>
            </div>
          </div>

          {/* Details */}
          <div style={{
            background: 'var(--bg-elev-2)',
            border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 16px',
            marginBottom: 20, display: 'grid', gap: 10,
          }}>
            {[
              ['Cancha', reservation.courtId?.name],
              ['Sede', reservation.courtId?.location],
              ['Fecha', reservation.date],
              ['Horario', `${reservation.startTime} – ${reservation.endTime} (${reservation.durationHours}h)`],
              ['Método', PAYMENT_LABEL[reservation.paymentMethod] ?? reservation.paymentMethod],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 13 }}>
                <span style={{ color: 'var(--fg-faint)', flexShrink: 0 }}>{label}</span>
                <span style={{ color: 'var(--fg)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Proof */}
          {reservation.proofUrl ? (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Comprobante
              </div>
              {reservation.proofUrl.startsWith('dev-') ? (
                <p style={{ fontSize: 12, color: 'var(--fg-faint)', fontStyle: 'italic' }}>
                  (Entorno dev — sin imagen real: {reservation.proofUrl})
                </p>
              ) : (
                <a
                  href={reservation.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    fontSize: 13, color: 'var(--accent)', fontWeight: 500,
                    background: 'var(--accent-soft)', padding: '8px 14px',
                    borderRadius: 8, textDecoration: 'none',
                  }}
                >
                  {Icons.eye(14)} Ver comprobante
                </a>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--fg-faint)', marginBottom: 20, fontStyle: 'italic' }}>
              Sin comprobante adjunto
            </p>
          )}

          {/* Actions */}
          {reservation.status === 'pending' && (
            <div style={{
              display: 'flex', gap: 10,
              paddingTop: 16, borderTop: '1px solid var(--border)',
            }}>
              <button
                onClick={() => onApprove(reservation._id)}
                disabled={loading}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                {Icons.check(15)}
                {loading ? 'Procesando...' : 'Aprobar y enviar QR'}
              </button>
              <button
                onClick={() => onReject(reservation._id)}
                disabled={loading}
                className="btn-danger"
                style={{ flex: 1 }}
              >
                {Icons.x(15)}
                Rechazar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Table row ─── */
function TableRow({
  r, onView, onApprove, onReject, loading,
}: {
  r: PopulatedReservation;
  onView: (r: PopulatedReservation) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  loading: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      style={{ borderBottom: '1px solid var(--border)', background: hovered ? 'var(--bg-hover)' : 'transparent', transition: 'background 100ms' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td style={{ padding: '11px 16px' }}><StatusBadge status={r.status} /></td>
      <td style={{ padding: '11px 16px' }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--fg-faint)' }}>{r.reservationCode}</span>
      </td>
      <td style={{ padding: '11px 16px', minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--fg)' }}>{r.courtId?.name ?? '—'}</div>
        <div style={{ fontSize: 12, color: 'var(--fg-faint)' }}>{r.courtId?.location ?? ''}</div>
      </td>
      <td style={{ padding: '11px 16px', minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{r.userId?.name ?? '—'}</div>
        <div style={{ fontSize: 12, color: 'var(--fg-faint)' }}>{r.userId?.email ?? ''}</div>
      </td>
      <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>{r.date}</div>
        <div style={{ fontSize: 12, color: 'var(--fg-faint)' }}>{r.startTime}–{r.endTime}</div>
      </td>
      <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => onView(r)} className="btn-ghost" title="Ver detalle">
            {Icons.eye(15)}
          </button>
          {r.status === 'pending' && (
            <>
              <button
                onClick={() => onApprove(r._id)}
                disabled={loading}
                className="btn-primary"
                style={{ height: 30, padding: '0 10px', fontSize: 12 }}
              >
                {Icons.check(13)} Aprobar
              </button>
              <button
                onClick={() => onReject(r._id)}
                disabled={loading}
                className="btn-danger"
                style={{ height: 30, padding: '0 10px', fontSize: 12 }}
              >
                Rechazar
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ─── Mobile card ─── */
function ReservationCard({
  r, onView, onApprove, onReject, loading,
}: {
  r: PopulatedReservation;
  onView: (r: PopulatedReservation) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Avatar name={r.userId?.name || '?'} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--fg)' }}>{r.userId?.name ?? '—'}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-faint)' }}>{r.userId?.email ?? ''}</div>
        </div>
        <StatusBadge status={r.status} />
      </div>
      <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 4 }}>
        {r.courtId?.name ?? '—'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--fg-faint)' }}>{r.reservationCode}</span>
        <span style={{ fontSize: 12, color: 'var(--fg-faint)' }}>·</span>
        <span style={{ fontSize: 12, color: 'var(--fg-faint)' }}>{r.date} · {r.startTime}–{r.endTime}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <button onClick={() => onView(r)} className="btn-ghost" style={{ height: 30, fontSize: 12 }}>
          Ver
        </button>
        {r.status === 'pending' && (
          <>
            <button
              onClick={() => onApprove(r._id)}
              disabled={loading}
              className="btn-primary"
              style={{ marginLeft: 'auto', height: 30, padding: '0 12px', fontSize: 12 }}
            >
              {loading ? '...' : 'Aprobar'}
            </button>
            <button
              onClick={() => onReject(r._id)}
              disabled={loading}
              className="btn-danger"
              style={{ height: 30, padding: '0 12px', fontSize: 12 }}
            >
              Rechazar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function Reservations() {
  const [reservations, setReservations] = useState<PopulatedReservation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selected, setSelected] = useState<PopulatedReservation | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      params.set('page', String(targetPage));
      params.set('limit', String(LIMIT));

      const res = await api.get<{
        success: boolean;
        data: { reservations: PopulatedReservation[]; total: number; page: number };
      }>(`/api/admin/reservations?${params.toString()}`);

      setReservations(res.data.data.reservations);
      setTotal(res.data.data.total);
      setPage(res.data.data.page);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [statusFilter, search]);

  useEffect(() => { load(1); }, [statusFilter]);

  // Debounce search — espera 400ms antes de ir al backend
  useEffect(() => {
    const t = setTimeout(() => load(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  function handlePageChange(newPage: number) {
    load(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleApprove(id: string) {
    setActionId(id);
    try {
      await api.post(`/api/admin/reservations/${id}/approve`, {});
      showToast('Reserva aprobada · correo con QR enviado');
      await load(page);
      setSelected(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Error al aprobar');
    } finally { setActionId(null); }
  }

  async function handleReject(id: string) {
    if (!confirm('¿Rechazar esta reserva?')) return;
    setActionId(id);
    try {
      await api.post(`/api/admin/reservations/${id}/reject`, {});
      showToast('Reserva rechazada');
      await load(page);
      setSelected(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Error al rechazar');
    } finally { setActionId(null); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Toast */}
      {toast && (
        <div
          className="animate-slide-up"
          style={{
            position: 'fixed', bottom: 24, right: 24,
            background: 'var(--bg-elev)', border: '1px solid var(--border)',
            color: 'var(--fg)', padding: '10px 18px',
            borderRadius: 10, fontSize: 13, zIndex: 50,
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--fg-faint)' }}>
          {total > 0
            ? `${total} reserva${total === 1 ? '' : 's'} en total`
            : loading ? '' : 'Sin resultados'}
        </div>
        <button onClick={() => load(page)} className="btn-secondary">
          {Icons.refresh(15)} Actualizar
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 2, overflowX: 'auto',
          background: 'var(--bg-elev-2)', borderRadius: 10, padding: 4,
          border: '1px solid var(--border)',
          scrollbarWidth: 'none',
        }}>
          {STATUS_TABS.map(tab => (
            <TabBtn
              key={tab.value}
              active={statusFilter === tab.value}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </TabBtn>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-faint)' }}>
            {Icons.search(15)}
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por código de reserva..."
            className="input"
            style={{ paddingLeft: 34 }}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Spinner />
        </div>
      ) : reservations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-faint)' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>📭</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            {search ? `Sin resultados para "${search}".` : 'No hay reservas en esta categoría'}
          </div>
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="lg:hidden" style={{ flexDirection: 'column', gap: 10 }}>
            {reservations.map(r => (
              <ReservationCard
                key={r._id} r={r}
                onView={setSelected}
                onApprove={handleApprove}
                onReject={handleReject}
                loading={actionId === r._id}
              />
            ))}
            <Pagination page={page} total={total} limit={LIMIT} onChange={handlePageChange} />
          </div>

          {/* Desktop table */}
          <div className="card hidden lg:block" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Estado', 'Código', 'Cancha', 'Usuario', 'Fecha y horario', 'Acciones'].map((h, i) => (
                      <th key={h} style={{
                        padding: '10px 16px',
                        textAlign: i === 5 ? 'right' : 'left',
                        fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: 0.7, color: 'var(--fg-faint)',
                        background: 'var(--bg-elev-2)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reservations.map(r => (
                    <TableRow
                      key={r._id} r={r}
                      onView={setSelected}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      loading={actionId === r._id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={total} limit={LIMIT} onChange={handlePageChange} />
          </div>
        </>
      )}

      {selected && (
        <ReservationModal
          reservation={selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          loading={actionId === selected._id}
        />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 7,
        fontSize: 13, fontWeight: active ? 500 : 400,
        background: active ? 'var(--bg-elev)' : 'transparent',
        color: active ? 'var(--fg)' : 'var(--fg-muted)',
        border: active ? '1px solid var(--border)' : '1px solid transparent',
        cursor: 'pointer', transition: 'all 100ms', whiteSpace: 'nowrap',
        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
        opacity: !active && hovered ? 0.8 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      border: '2px solid var(--border)',
      borderTopColor: 'var(--accent)',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}
