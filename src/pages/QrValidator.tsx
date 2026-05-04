import { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import type { IReservation, ICourt, IUser } from '../types';
import api from '../lib/api';

type PopulatedReservation = Omit<IReservation, 'userId' | 'courtId'> & {
  userId: IUser;
  courtId: ICourt;
};

const STATUS_MAP: Record<string, { bg: string; fg: string; label: string }> = {
  pending:  { bg: 'var(--warn-soft)',          fg: 'var(--warn)',   label: 'Pendiente' },
  approved: { bg: 'var(--accent-soft-strong)', fg: 'var(--accent)', label: 'Aprobada' },
  rejected: { bg: 'var(--danger-soft)',        fg: 'var(--danger)', label: 'Rechazada' },
  used:     { bg: 'var(--info-soft)',          fg: 'var(--info)',   label: 'Ya utilizada' },
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
  qr:     ICO(<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v3M14 18v3h3M18 18v3M21 18v3"/></>),
  check:  ICO(<><path d="m5 12 5 5L20 7"/></>, 2),
  arrL:   ICO(<><path d="M19 12H5M11 6l-6 6 6 6"/></>),
  cam:    ICO(<><path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z"/><circle cx="12" cy="13" r="3.5"/></>),
  keyboard: ICO(<><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/></>),
};

function extractCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const tokenParam = url.searchParams.get('token');
    if (tokenParam) return tokenParam;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
    return null;
  } catch {
    return trimmed;
  }
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { bg: 'var(--bg-elev-2)', fg: 'var(--fg-faint)', label: status };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 999,
      background: s.bg, color: s.fg,
      fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.fg }} />
      {s.label}
    </span>
  );
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
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

/* ─── Camera ─── */
function QrCamera({ onScan }: { onScan: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const scannedRef = useRef(false);
  const [camError, setCamError] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    scannedRef.current = false;

    type BarcodeDetectorType = { detect: (el: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
    const detector: BarcodeDetectorType | null = 'BarcodeDetector' in window
      ? new (window as unknown as { BarcodeDetector: new (o: object) => BarcodeDetectorType }).BarcodeDetector({ formats: ['qr_code'] })
      : null;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => {
        stream = s;
        if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); }
        tick();
      })
      .catch(() => setCamError('No se pudo acceder a la cámara. Usa la entrada manual.'));

    function tick() {
      if (scannedRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== 4) { rafRef.current = requestAnimationFrame(tick); return; }
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);

      if (detector) {
        detector.detect(video)
          .then(codes => {
            if (codes.length > 0 && !scannedRef.current) {
              scannedRef.current = true;
              onScan(codes[0].rawValue);
            }
          })
          .catch(() => {})
          .finally(() => { if (!scannedRef.current) rafRef.current = requestAnimationFrame(tick); });
        return;
      }

      // Fallback: jsQR para Safari/Firefox donde BarcodeDetector no existe
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' });
      if (code && !scannedRef.current) {
        scannedRef.current = true;
        onScan(code.data);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => { cancelAnimationFrame(rafRef.current); stream?.getTracks().forEach(t => t.stop()); };
  }, [onScan]);

  if (camError) {
    return (
      <div style={{
        background: 'var(--warn-soft)', border: '1px solid color-mix(in oklch, var(--warn), transparent 60%)',
        borderRadius: 10, padding: '14px 16px', fontSize: 13, color: 'var(--warn)',
      }}>
        {camError}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000', aspectRatio: '1/1', maxWidth: 360, margin: '0 auto' }}>
      <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} muted playsInline />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {/* Scanner frame */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ position: 'relative', width: 200, height: 200 }}>
          {[
            { top: -2, left: -2, borderTop: `3px solid var(--accent)`, borderLeft: `3px solid var(--accent)`, borderRadius: '12px 0 0 0' },
            { top: -2, right: -2, borderTop: `3px solid var(--accent)`, borderRight: `3px solid var(--accent)`, borderRadius: '0 12px 0 0' },
            { bottom: -2, left: -2, borderBottom: `3px solid var(--accent)`, borderLeft: `3px solid var(--accent)`, borderRadius: '0 0 0 12px' },
            { bottom: -2, right: -2, borderBottom: `3px solid var(--accent)`, borderRight: `3px solid var(--accent)`, borderRadius: '0 0 12px 0' },
          ].map((s, i) => (
            <span key={i} style={{ position: 'absolute', width: 28, height: 28, ...s }} />
          ))}
          <span style={{
            position: 'absolute', left: 4, right: 4, top: '50%',
            height: 2, background: 'var(--accent)',
            boxShadow: '0 0 12px 2px var(--accent-soft)',
            animation: 'fade-in 1s ease-in-out infinite alternate',
          }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Result ─── */
function ReservationResult({
  reservation, onMarkUsed, onReset, marking,
}: {
  reservation: PopulatedReservation;
  onMarkUsed: () => void;
  onReset: () => void;
  marking: boolean;
}) {
  return (
    <div className="card animate-slide-up" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <StatusBadge status={reservation.status} />
        <span className="mono" style={{ fontSize: 12, color: 'var(--fg-faint)', flex: 1 }}>
          {reservation.reservationCode}
        </span>
      </div>

      <div style={{ padding: 20 }}>
        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <Avatar name={reservation.userId?.name || '?'} size={44} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{reservation.userId?.name || '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{reservation.userId?.email || '—'}</div>
          </div>
        </div>

        {/* Details */}
        <div style={{
          background: 'var(--bg-elev-2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '14px 16px',
          marginBottom: 18, display: 'grid', gap: 10,
        }}>
          {[
            ['Cancha',   reservation.courtId?.name],
            ['Sede',     reservation.courtId?.location],
            ['Fecha',    reservation.date],
            ['Horario',  `${reservation.startTime} – ${reservation.endTime}`],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 13 }}>
              <span style={{ color: 'var(--fg-faint)' }}>{label}</span>
              <span style={{ color: 'var(--fg)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Action */}
        {reservation.status === 'approved' ? (
          <button
            onClick={onMarkUsed}
            disabled={marking}
            className="btn-primary"
            style={{ width: '100%', height: 44, fontSize: 14 }}
          >
            {Icons.check(16)} {marking ? 'Procesando...' : 'Marcar como utilizada'}
          </button>
        ) : (
          <div style={{
            textAlign: 'center', padding: '12px',
            borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: reservation.status === 'used' ? 'var(--info-soft)' : 'var(--danger-soft)',
            color: reservation.status === 'used' ? 'var(--info)' : 'var(--danger)',
          }}>
            {reservation.status === 'used' ? 'Esta reserva ya fue utilizada' : 'Esta reserva no está activa'}
          </div>
        )}

        <button
          onClick={onReset}
          style={{
            marginTop: 14, width: '100%',
            background: 'transparent', border: 'none',
            color: 'var(--fg-muted)', fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px',
          }}
        >
          {Icons.arrL(14)} Validar otro código
        </button>
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function QrValidator() {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualInput, setManualInput] = useState('');
  const [reservation, setReservation] = useState<PopulatedReservation | null>(null);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState('');

  const validate = useCallback(async (raw: string) => {
    const code = extractCode(raw);
    if (!code) { setError('Código inválido o formato no reconocido'); return; }
    setLoading(true); setError(''); setReservation(null);
    try {
      const res = await api.get<{ success: boolean; data: PopulatedReservation }>(
        `/api/admin/qr/${encodeURIComponent(code)}`
      );
      setReservation(res.data.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Código no encontrado o inválido');
    } finally { setLoading(false); }
  }, []);

  async function handleMarkUsed() {
    if (!reservation) return;
    setMarking(true);
    try {
      await api.post(`/api/admin/qr/${encodeURIComponent(reservation.reservationCode)}/use`, {});
      setReservation(r => r ? { ...r, status: 'used' as IReservation['status'] } : r);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Error al marcar como utilizada');
    } finally { setMarking(false); }
  }

  function reset() { setReservation(null); setError(''); setManualInput(''); }

  return (
    <div style={{ maxWidth: 440, margin: '0 auto' }}>
      {/* Mode toggle */}
      <div style={{
        display: 'inline-flex', gap: 2,
        background: 'var(--bg-elev-2)', borderRadius: 10, padding: 4,
        border: '1px solid var(--border)', marginBottom: 24,
      }}>
        {[
          { id: 'camera', label: 'Cámara', icon: Icons.cam },
          { id: 'manual', label: 'Manual', icon: Icons.keyboard },
        ].map(m => (
          <ModeBtn
            key={m.id}
            active={mode === m.id}
            onClick={() => { setMode(m.id as 'camera' | 'manual'); reset(); }}
          >
            {m.icon(14)} {m.label}
          </ModeBtn>
        ))}
      </div>

      {!reservation && !loading && (
        <>
          {mode === 'camera' ? (
            <div style={{ marginBottom: 20 }}>
              <QrCamera onScan={validate} />
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--fg-faint)', marginTop: 12 }}>
                Apunta la cámara hacia el QR del usuario
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Código de reserva</div>
              <div style={{ fontSize: 12, color: 'var(--fg-faint)', marginBottom: 14 }}>
                Ej: <span className="mono">R-A3F2B1</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  value={manualInput}
                  onChange={e => setManualInput(e.target.value.toUpperCase())}
                  placeholder="R-XXXXXX"
                  className="input mono"
                  style={{ letterSpacing: 2, fontSize: 14 }}
                  onKeyDown={e => e.key === 'Enter' && validate(manualInput)}
                />
                <button
                  onClick={() => validate(manualInput)}
                  disabled={!manualInput.trim()}
                  className="btn-primary"
                  style={{ flexShrink: 0 }}
                >
                  Validar
                </button>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              background: 'var(--danger-soft)', border: '1px solid color-mix(in oklch, var(--danger), transparent 60%)',
              borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--danger)',
            }}>
              {error}
            </div>
          )}
        </>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{
            display: 'inline-block', width: 28, height: 28, borderRadius: '50%',
            border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
            animation: 'spin 0.7s linear infinite', marginBottom: 12,
          }} />
          <div style={{ color: 'var(--fg-faint)', fontSize: 13 }}>Verificando código...</div>
        </div>
      )}

      {reservation && (
        <ReservationResult
          reservation={reservation}
          onMarkUsed={handleMarkUsed}
          onReset={reset}
          marking={marking}
        />
      )}
    </div>
  );
}

function ModeBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 7,
        fontSize: 13, fontWeight: active ? 500 : 400,
        background: active ? 'var(--bg-elev)' : 'transparent',
        color: active ? 'var(--fg)' : 'var(--fg-muted)',
        border: active ? '1px solid var(--border)' : '1px solid transparent',
        cursor: 'pointer', transition: 'all 100ms',
        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
      }}
    >
      {children}
    </button>
  );
}
