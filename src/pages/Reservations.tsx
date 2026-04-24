import { useState, useEffect, useCallback } from 'react';
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
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  used: 'bg-gray-100 text-gray-700',
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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Detalle de reserva</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">
            ✕
          </button>
        </div>

        {/* Status + code */}
        <div className="flex items-center gap-3 mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[reservation.status]}`}>
            {STATUS_LABEL[reservation.status]}
          </span>
          <span className="font-mono text-sm text-gray-500">{reservation.reservationCode}</span>
        </div>

        {/* Info grid */}
        <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2.5 text-sm">
          <Row label="Cancha" value={reservation.courtId.name} />
          <Row label="Sede" value={reservation.courtId.location} />
          <Row label="Fecha" value={reservation.date} />
          <Row label="Horario" value={`${reservation.startTime} – ${reservation.endTime} (${reservation.durationHours}h)`} />
          <Row label="Pago" value={PAYMENT_LABEL[reservation.paymentMethod] ?? reservation.paymentMethod} />
          <div className="border-t border-gray-200 pt-2.5">
            <Row label="Usuario" value={reservation.userId.name} />
            <Row label="Email" value={reservation.userId.email} />
          </div>
        </div>

        {/* Proof */}
        {reservation.proofUrl ? (
          <div className="mb-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Comprobante de pago</p>
            {reservation.proofUrl.startsWith('dev-') ? (
              <p className="text-xs text-gray-400 italic">
                (Entorno dev — sin imagen real: {reservation.proofUrl})
              </p>
            ) : (
              <a
                href={reservation.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium"
              >
                📎 Ver comprobante
              </a>
            )}
          </div>
        ) : (
          <div className="mb-5">
            <p className="text-sm text-gray-400">Sin comprobante adjunto</p>
          </div>
        )}

        {/* Actions */}
        {reservation.status === 'pending' && (
          <div className="flex gap-3">
            <button
              onClick={() => onApprove(reservation._id)}
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Procesando...' : '✓ Aprobar y enviar QR'}
            </button>
            <button
              onClick={() => onReject(reservation._id)}
              disabled={loading}
              className="flex-1 bg-red-50 text-red-700 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              ✕ Rechazar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-gray-800 font-medium text-right">{value}</span>
    </div>
  );
}

/* ─────────────── Fila de reserva ─────────────── */
function ReservationRow({
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
    <div className="bg-white rounded-xl p-4 flex items-start gap-4 hover:shadow-sm transition-shadow">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[r.status]}`}>
            {STATUS_LABEL[r.status]}
          </span>
          <span className="font-mono text-xs text-gray-400">{r.reservationCode}</span>
        </div>
        <p className="font-semibold text-gray-900 truncate">{r.courtId.name}</p>
        <p className="text-sm text-gray-500">
          {r.date} · {r.startTime}–{r.endTime}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {r.userId.name} · {r.userId.email}
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => onView(r)}
          className="text-xs text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Ver
        </button>
        {r.status === 'pending' && (
          <>
            <button
              onClick={() => onApprove(r._id)}
              disabled={loading}
              className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : 'Aprobar'}
            </button>
            <button
              onClick={() => onReject(r._id)}
              disabled={loading}
              className="text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
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

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-5 py-3 rounded-xl text-sm shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservas</h1>
          <p className="text-gray-400 text-sm">{total} en total</p>
        </div>
        <button
          onClick={load}
          className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          ↻ Actualizar
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : reservations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📭</div>
          <p>No hay reservas en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {reservations.map((r) => (
            <ReservationRow
              key={r._id}
              r={r}
              onView={setSelected}
              onApprove={handleApprove}
              onReject={handleReject}
              loading={actionId === r._id}
            />
          ))}
        </div>
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
