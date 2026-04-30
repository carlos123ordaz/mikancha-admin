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

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  pending:  { bg: 'var(--warn-soft)',          fg: 'var(--warn)',   label: 'Pendiente' },
  approved: { bg: 'var(--accent-soft-strong)', fg: 'var(--accent)', label: 'Aprobada' },
  used:     { bg: 'var(--info-soft)',          fg: 'var(--info)',   label: 'Usada' },
  rejected: { bg: 'var(--danger-soft)',        fg: 'var(--danger)', label: 'Rechazada' },
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
    setLoading(true); setError('');
    try {
      const res = await api.get<{
        success: boolean;
        data: { reservations: AdminReservation[] };
      }>(`/api/admin/reservations?courtId=${courtId}&date=${date}&limit=200`);
      const active = res.data.data.reservations.filter(
        r => r.status === 'pending' || r.status === 'approved' || r.status === 'used'
      );
      setReservations(active);
    } catch {
      setError('No se pudieron cargar las reservas');
    } finally {
      setLoading(false);
    }
  }, [courtId, date]);

  useEffect(() => { load(); }, [load]);

  const validWindows = useMemo(
    () => operatingWindows.filter(w => w.startTime && w.endTime),
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
      <div style={{
        textAlign: 'center', padding: '24px',
        background: 'var(--bg-elev-2)', borderRadius: 10,
        fontSize: 13, color: 'var(--fg-faint)',
      }}>
        Configura al menos una ventana horaria para ver disponibilidad.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 12, color: 'var(--fg-faint)' }}>Fecha</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="input"
            style={{ width: 'auto', fontSize: 13, padding: '6px 10px' }}
          />
          <button
            type="button"
            onClick={load}
            style={{
              fontSize: 16, color: 'var(--fg-faint)', background: 'transparent',
              border: '1px solid var(--border)', borderRadius: 6,
              padding: '4px 10px', cursor: 'pointer', transition: 'all 120ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-faint)'; }}
          >
            ↻
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--fg-faint)' }}>
          {reservations.length} reserva{reservations.length === 1 ? '' : 's'} ·{' '}
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
            {((freeHours.totalMin - freeHours.busyMin) / 60).toFixed(1)}h libres
          </span>{' '}
          / {(freeHours.totalMin / 60).toFixed(1)}h totales
        </div>
      </div>

      {error && (
        <div style={{
          background: 'var(--danger-soft)', border: '1px solid color-mix(in oklch, var(--danger), transparent 60%)',
          borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--danger)',
        }}>
          {error}
        </div>
      )}

      {/* Windows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {validWindows.map((win, wIdx) => {
          const wStart = toMinutes(win.startTime);
          const wEnd = toMinutes(win.endTime);
          const wDur = Math.max(1, wEnd - wStart);

          const winReservations = reservations
            .filter(r => toMinutes(r.startTime) < wEnd && toMinutes(r.endTime) > wStart)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          const markers: number[] = [];
          const firstMarker = Math.ceil(wStart / 60) * 60;
          for (let t = firstMarker; t <= wEnd; t += 60) markers.push(t);

          return (
            <div key={wIdx} style={{
              border: '1px solid var(--border)', borderRadius: 10,
              padding: 14, background: 'var(--bg-elev-2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)' }}>
                  Ventana {wIdx + 1} · {win.startTime} – {win.endTime}
                </span>
                <span style={{ fontSize: 11, color: 'var(--fg-faint)' }}>
                  {winReservations.length} reserva{winReservations.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Timeline bar */}
              <div style={{
                position: 'relative', height: 36,
                background: 'var(--accent-soft)',
                borderRadius: 6, overflow: 'hidden',
              }}>
                {winReservations.map(r => {
                  const rStart = Math.max(toMinutes(r.startTime), wStart);
                  const rEnd = Math.min(toMinutes(r.endTime), wEnd);
                  const left = ((rStart - wStart) / wDur) * 100;
                  const width = ((rEnd - rStart) / wDur) * 100;
                  const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending;
                  const user = typeof r.userId === 'object' ? r.userId.name : '';
                  return (
                    <div
                      key={r._id}
                      style={{
                        position: 'absolute', top: 0, bottom: 0,
                        left: `${left}%`, width: `${width}%`,
                        background: s.bg,
                        borderLeft: `2px solid ${s.fg}`,
                        borderRight: `1px solid ${s.fg}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 600, color: s.fg, overflow: 'hidden',
                      }}
                      title={`${r.startTime}–${r.endTime} · ${user} · ${s.label} · ${r.reservationCode}`}
                    >
                      {width > 8 ? r.startTime : ''}
                    </div>
                  );
                })}

                {markers.map(t => {
                  const pct = ((t - wStart) / wDur) * 100;
                  return (
                    <div key={t} style={{
                      position: 'absolute', top: 0, bottom: 0,
                      left: `${pct}%`,
                      borderLeft: '1px solid var(--border)',
                    }} />
                  );
                })}
              </div>

              {/* Hour labels */}
              <div style={{ position: 'relative', height: 16, marginTop: 4 }}>
                {markers.map(t => {
                  const pct = ((t - wStart) / wDur) * 100;
                  return (
                    <span key={t} className="mono" style={{
                      position: 'absolute', top: 0, fontSize: 9,
                      color: 'var(--fg-faint)', transform: 'translateX(-50%)',
                      left: `${pct}%`,
                    }}>
                      {String(Math.floor(t / 60)).padStart(2, '0')}:00
                    </span>
                  );
                })}
              </div>

              {/* Reservation list */}
              {winReservations.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {winReservations.map(r => {
                    const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.pending;
                    const user = typeof r.userId === 'object' ? r.userId : null;
                    return (
                      <div key={r._id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        fontSize: 12, background: 'var(--bg-elev)',
                        borderRadius: 6, padding: '6px 12px',
                        border: '1px solid var(--border)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.fg, flexShrink: 0 }} />
                          <span className="mono" style={{ color: 'var(--fg-faint)', flexShrink: 0 }}>
                            {r.startTime}–{r.endTime}
                          </span>
                          {user && (
                            <span style={{ color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              · {user.name}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                          <span style={{ color: s.fg, fontWeight: 500 }}>{s.label}</span>
                          <span className="mono" style={{ fontSize: 10, color: 'var(--fg-faint)' }}>{r.reservationCode}</span>
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

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, fontSize: 11, color: 'var(--fg-faint)', paddingTop: 4 }}>
        {[
          { label: 'Libre',     bg: 'var(--accent-soft)',          fg: 'var(--accent)' },
          { label: 'Pendiente', bg: 'var(--warn-soft)',            fg: 'var(--warn)' },
          { label: 'Aprobada',  bg: 'var(--accent-soft-strong)',   fg: 'var(--accent)' },
          { label: 'Usada',     bg: 'var(--info-soft)',            fg: 'var(--info)' },
        ].map(item => (
          <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: item.bg, border: `1px solid ${item.fg}` }} />
            {item.label}
          </span>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--fg-faint)', padding: '4px 0' }}>
          Cargando...
        </div>
      )}
    </div>
  );
}
