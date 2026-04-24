import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../lib/api';
import type { TimeSlot, ReservationStatus } from '../types';

interface AdminReservation {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  status: ReservationStatus;
  reservationCode: string;
  userId: { _id: string; name: string; email: string } | string;
}

interface Props {
  courtId: string;
  operatingWindows: TimeSlot[];
}

const STATUS_COLOR: Record<string, { bg: string; border: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-200', border: 'border-yellow-400', text: 'text-yellow-900', label: 'Pendiente' },
  approved: { bg: 'bg-green-300', border: 'border-green-500', text: 'text-green-900', label: 'Aprobada' },
  used: { bg: 'bg-gray-300', border: 'border-gray-400', text: 'text-gray-800', label: 'Usada' },
  rejected: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', label: 'Rechazada' },
};

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function todayLocal(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

export default function CourtAvailabilityTimeline({ courtId, operatingWindows }: Props) {
  const [date, setDate] = useState(todayLocal());
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!courtId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{
        success: boolean;
        data: { reservations: AdminReservation[] };
      }>(`/api/admin/reservations?courtId=${courtId}&date=${date}&limit=200`);
      // Sólo contamos como "ocupados" los estados que bloquean el slot
      const active = res.data.data.reservations.filter(
        (r) => r.status === 'pending' || r.status === 'approved' || r.status === 'used'
      );
      setReservations(active);
    } catch {
      setError('No se pudieron cargar las reservas');
    } finally {
      setLoading(false);
    }
  }, [courtId, date]);

  useEffect(() => {
    load();
  }, [load]);

  const validWindows = useMemo(
    () => operatingWindows.filter((w) => w.startTime && w.endTime),
    [operatingWindows]
  );

  const freeHours = useMemo(() => {
    let total = 0;
    for (const w of validWindows) {
      total += Math.max(0, toMinutes(w.endTime) - toMinutes(w.startTime));
    }
    const busy = reservations.reduce((sum, r) => sum + r.durationHours * 60, 0);
    return { totalMin: total, busyMin: Math.min(busy, total) };
  }, [validWindows, reservations]);

  if (validWindows.length === 0) {
    return (
      <div className="text-center py-6 bg-gray-50 rounded-xl text-sm text-gray-400">
        Configura al menos una ventana horaria para ver disponibilidad.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date picker + summary */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Fecha</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input text-sm py-1.5"
          />
          <button
            type="button"
            onClick={load}
            className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded-md hover:bg-gray-100"
          >
            ↻
          </button>
        </div>
        <div className="text-xs text-gray-500">
          {reservations.length} reserva{reservations.length === 1 ? '' : 's'} ·{' '}
          <span className="text-green-700 font-semibold">
            {((freeHours.totalMin - freeHours.busyMin) / 60).toFixed(1)}h libres
          </span>{' '}
          / {(freeHours.totalMin / 60).toFixed(1)}h totales
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Timelines por ventana */}
      <div className="space-y-4">
        {validWindows.map((win, wIdx) => {
          const wStart = toMinutes(win.startTime);
          const wEnd = toMinutes(win.endTime);
          const wDur = Math.max(1, wEnd - wStart);

          const winReservations = reservations
            .filter((r) => toMinutes(r.startTime) < wEnd && toMinutes(r.endTime) > wStart)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          // Marcadores horarios
          const markers: number[] = [];
          const firstMarker = Math.ceil(wStart / 60) * 60;
          for (let t = firstMarker; t <= wEnd; t += 60) markers.push(t);

          return (
            <div key={wIdx} className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600">
                  Ventana {wIdx + 1} · {win.startTime} – {win.endTime}
                </p>
                <p className="text-xs text-gray-400">
                  {winReservations.length} reserva{winReservations.length === 1 ? '' : 's'}
                </p>
              </div>

              {/* Barra de tiempo */}
              <div className="relative h-10 bg-green-100 rounded-lg overflow-hidden">
                {/* Reservas */}
                {winReservations.map((r) => {
                  const rStart = Math.max(toMinutes(r.startTime), wStart);
                  const rEnd = Math.min(toMinutes(r.endTime), wEnd);
                  const left = ((rStart - wStart) / wDur) * 100;
                  const width = ((rEnd - rStart) / wDur) * 100;
                  const color = STATUS_COLOR[r.status] ?? STATUS_COLOR.pending;
                  const user = typeof r.userId === 'object' ? r.userId.name : '';
                  return (
                    <div
                      key={r._id}
                      className={`absolute top-0 bottom-0 ${color.bg} border-l border-r ${color.border} flex items-center justify-center text-[10px] font-semibold ${color.text} overflow-hidden`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${r.startTime}–${r.endTime} · ${user} · ${color.label} · ${r.reservationCode}`}
                    >
                      {width > 8 ? `${r.startTime}` : ''}
                    </div>
                  );
                })}

                {/* Marcadores de hora */}
                {markers.map((t) => {
                  const pct = ((t - wStart) / wDur) * 100;
                  return (
                    <div
                      key={t}
                      className="absolute top-0 bottom-0 border-l border-gray-300/60"
                      style={{ left: `${pct}%` }}
                    />
                  );
                })}
              </div>

              {/* Etiquetas de hora */}
              <div className="relative h-4 mt-1">
                {markers.map((t) => {
                  const pct = ((t - wStart) / wDur) * 100;
                  return (
                    <span
                      key={t}
                      className="absolute top-0 text-[10px] text-gray-400 -translate-x-1/2"
                      style={{ left: `${pct}%` }}
                    >
                      {String(Math.floor(t / 60)).padStart(2, '0')}:00
                    </span>
                  );
                })}
              </div>

              {/* Lista de reservas en esta ventana */}
              {winReservations.length > 0 && (
                <div className="mt-3 space-y-1">
                  {winReservations.map((r) => {
                    const color = STATUS_COLOR[r.status] ?? STATUS_COLOR.pending;
                    const user = typeof r.userId === 'object' ? r.userId : null;
                    return (
                      <div
                        key={r._id}
                        className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-1.5 border border-gray-100"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full ${color.bg}`} />
                          <span className="font-mono text-gray-500 flex-shrink-0">
                            {r.startTime}–{r.endTime}
                          </span>
                          {user && (
                            <span className="text-gray-700 truncate">
                              · {user.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`${color.text} font-medium`}>{color.label}</span>
                          <span className="font-mono text-gray-400">{r.reservationCode}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 pt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-green-100 rounded" />
          Libre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-yellow-200 border border-yellow-400 rounded" />
          Pendiente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-green-300 border border-green-500 rounded" />
          Aprobada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 bg-gray-300 border border-gray-400 rounded" />
          Usada
        </span>
      </div>

      {loading && (
        <div className="text-center text-xs text-gray-400 py-1">Cargando...</div>
      )}
    </div>
  );
}
