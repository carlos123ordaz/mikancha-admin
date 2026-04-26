import { useState, useEffect, useCallback, useMemo } from 'react';
import type { IReservation, ICourt, IUser } from '../types';
import api from '../lib/api';

type PopulatedReservation = Omit<IReservation, 'userId' | 'courtId'> & {
  userId: IUser;
  courtId: ICourt;
};

const STATUS_TABS = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'used', label: 'Usadas' },
];

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

const PAYMENT_LABEL: Record<string, string> = {
  yape: 'Yape',
  transfer: 'Transferencia',
};

/* ─────────────── Iconos ─────────────── */
const IconRefresh = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5" />
  </svg>
);
const IconSearch = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
  </svg>
);
const IconCheck = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <path d="M5 12l5 5L20 7" />
  </svg>
);
const IconX = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const IconEye = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

/* ─────────────── Modal de detalle ─────────────── */
function ReservationModal({
  reservation,
  onClose,
  onApprove,
  onReject,
  loading,
}: {
  reservation: PopulatedReservation;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Detalle de reserva</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <IconX className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {/* Status + code */}
          <div className="flex items-center gap-3 mb-5">
            <span className={`badge ${STATUS_BADGE[reservation.status]}`}>
              {STATUS_LABEL[reservation.status]}
            </span>
            <span className="font-mono text-sm text-slate-500 tracking-wider">{reservation.reservationCode}</span>
          </div>

          {/* Info */}
          <div className="bg-slate-50 ring-1 ring-slate-100 rounded-xl p-4 mb-5 space-y-2.5 text-sm">
            <Row label="Cancha" value={reservation.courtId.name} />
            <Row label="Sede" value={reservation.courtId.location} />
            <Row label="Fecha" value={reservation.date} />
            <Row
              label="Horario"
              value={`${reservation.startTime} – ${reservation.endTime} (${reservation.durationHours}h)`}
            />
            <Row label="Pago" value={PAYMENT_LABEL[reservation.paymentMethod] ?? reservation.paymentMethod} />
            <div className="border-t border-slate-200 pt-2.5">
              <Row label="Usuario" value={reservation.userId.name} />
              <Row label="Email" value={reservation.userId.email} />
            </div>
          </div>

          {/* Proof */}
          {reservation.proofUrl ? (
            <div className="mb-5">
              <p className="text-sm font-semibold text-slate-700 mb-2">Comprobante de pago</p>
              {reservation.proofUrl.startsWith('dev-') ? (
                <p className="text-xs text-slate-400 italic">
                  (Entorno dev — sin imagen real: {reservation.proofUrl})
                </p>
              ) : (
                <a
                  href={reservation.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary-700 hover:text-primary-800 font-medium bg-primary-50 ring-1 ring-primary-200 px-3 py-2 rounded-lg"
                >
                  📎 Ver comprobante
                </a>
              )}
            </div>
          ) : (
            <div className="mb-5">
              <p className="text-sm text-slate-400 italic">Sin comprobante adjunto</p>
            </div>
          )}

          {/* Actions */}
          {reservation.status === 'pending' && (
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => onApprove(reservation._id)}
                disabled={loading}
                className="btn-primary flex-1 py-2.5"
              >
                <IconCheck className="w-4 h-4" />
                {loading ? 'Procesando...' : 'Aprobar y enviar QR'}
              </button>
              <button
                onClick={() => onReject(reservation._id)}
                disabled={loading}
                className="btn-danger flex-1 py-2.5"
              >
                <IconX className="w-4 h-4" />
                Rechazar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-400 flex-shrink-0">{label}</span>
      <span className="text-slate-800 font-medium text-right">{value}</span>
    </div>
  );
}

/* ─────────────── Fila desktop (tabla) ─────────────── */
function ReservationTableRow({
  r,
  onView,
  onApprove,
  onReject,
  loading,
}: {
  r: PopulatedReservation;
  onView: (r: PopulatedReservation) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  loading: boolean;
}) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
      <td className="py-3 px-4">
        <span className={`badge ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
      </td>
      <td className="py-3 px-4 font-mono text-xs text-slate-500 tracking-wider">{r.reservationCode}</td>
      <td className="py-3 px-4 min-w-0">
        <p className="font-semibold text-slate-900 truncate">{r.courtId?.name ?? '—'}</p>
        <p className="text-xs text-slate-400 truncate">{r.courtId?.location ?? ''}</p>
      </td>
      <td className="py-3 px-4 min-w-0">
        <p className="text-sm text-slate-700 truncate">{r.userId?.name ?? '—'}</p>
        <p className="text-xs text-slate-400 truncate">{r.userId?.email ?? ''}</p>
      </td>
      <td className="py-3 px-4 whitespace-nowrap">
        <p className="text-sm text-slate-700">{r.date}</p>
        <p className="text-xs text-slate-400">
          {r.startTime}–{r.endTime}
        </p>
      </td>
      <td className="py-3 px-4 text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-1">
          <button
            onClick={() => onView(r)}
            className="btn-ghost py-1.5 px-2 text-xs"
            title="Ver detalle"
          >
            <IconEye className="w-4 h-4" />
          </button>
          {r.status === 'pending' && (
            <>
              <button
                onClick={() => onApprove(r._id)}
                disabled={loading}
                className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
              >
                <IconCheck className="w-3.5 h-3.5" />
                Aprobar
              </button>
              <button
                onClick={() => onReject(r._id)}
                disabled={loading}
                className="bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors disabled:opacity-50"
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

/* ─────────────── Card móvil ─────────────── */
function ReservationCard({
  r,
  onView,
  onApprove,
  onReject,
  loading,
}: {
  r: PopulatedReservation;
  onView: (r: PopulatedReservation) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className={`badge ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
        <span className="font-mono text-xs text-slate-400 tracking-wider">{r.reservationCode}</span>
      </div>
      <p className="font-semibold text-slate-900 truncate">{r.courtId?.name ?? '—'}</p>
      <p className="text-xs text-slate-500 mt-0.5">
        {r.date} · {r.startTime}–{r.endTime}
      </p>
      <p className="text-xs text-slate-400 mt-1 truncate">
        {r.userId?.name ?? '—'} · {r.userId?.email ?? ''}
      </p>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
        <button onClick={() => onView(r)} className="btn-ghost py-1.5 px-3 text-xs">
          Ver
        </button>
        {r.status === 'pending' && (
          <>
            <button
              onClick={() => onApprove(r._id)}
              disabled={loading}
              className="ml-auto bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : 'Aprobar'}
            </button>
            <button
              onClick={() => onReject(r._id)}
              disabled={loading}
              className="bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors disabled:opacity-50"
            >
              Rechazar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Página principal ─────────────── */
export default function Reservations() {
  const [reservations, setReservations] = useState<PopulatedReservation[]>([]);
  const [total, setTotal] = useState(0);
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await api.get<{
        success: boolean;
        data: { reservations: PopulatedReservation[]; total: number };
      }>(`/api/admin/reservations${qs}`);
      setReservations(res.data.data.reservations);
      setTotal(res.data.data.total);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reservations;
    return reservations.filter(
      (r) =>
        r.reservationCode.toLowerCase().includes(q) ||
        r.courtId?.name?.toLowerCase().includes(q) ||
        r.userId?.name?.toLowerCase().includes(q) ||
        r.userId?.email?.toLowerCase().includes(q)
    );
  }, [reservations, search]);

  async function handleApprove(id: string) {
    setActionId(id);
    try {
      await api.post(`/api/admin/reservations/${id}/approve`, {});
      showToast('Reserva aprobada · correo con QR enviado');
      await load();
      setSelected(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Error al aprobar');
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(id: string) {
    if (!confirm('¿Rechazar esta reserva?')) return;
    setActionId(id);
    try {
      await api.post(`/api/admin/reservations/${id}/reject`, {});
      showToast('Reserva rechazada');
      await load();
      setSelected(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Error al rechazar');
    } finally {
      setActionId(null);
    }
  }

  const pendingCount = reservations.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-xl text-sm shadow-2xl z-50 animate-fade-in">
          {toast}
        </div>
      )}

      {/* Header con summary + acciones */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Listado de reservas</h2>
          <p className="text-sm text-slate-500 mt-1">
            {total} en total
            {pendingCount > 0 && (
              <>
                {' · '}
                <span className="text-amber-700 font-semibold">{pendingCount} pendiente{pendingCount === 1 ? '' : 's'}</span>
              </>
            )}
          </p>
        </div>
        <button onClick={load} className="btn-secondary">
          <IconRefresh className="w-4 h-4" />
          Actualizar
        </button>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        {/* Status tabs */}
        <div className="inline-flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto scrollbar-thin">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:flex-none sm:w-72">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, cancha, usuario..."
            className="input pl-9"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">
          <div className="text-5xl mb-3 opacity-50">📭</div>
          <p className="text-sm font-medium">
            {search ? `Sin resultados para "${search}".` : 'No hay reservas en esta categoría'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 lg:hidden">
            {filtered.map((r) => (
              <ReservationCard
                key={r._id}
                r={r}
                onView={setSelected}
                onApprove={handleApprove}
                onReject={handleReject}
                loading={actionId === r._id}
              />
            ))}
          </div>

          {/* Desktop: tabla */}
          <div className="hidden lg:block card overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Cancha</th>
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Fecha y horario</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <ReservationTableRow
                      key={r._id}
                      r={r}
                      onView={setSelected}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      loading={actionId === r._id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
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
