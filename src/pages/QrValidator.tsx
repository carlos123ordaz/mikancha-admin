import { useState, useEffect, useRef, useCallback } from 'react';
import type { IReservation, ICourt, IUser } from '../types';
import api from '../lib/api';

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
  used: 'Ya utilizada',
};

/**
 * Extrae el código de reserva desde el contenido del QR.
 * Acepta:
 *  - Código directo: `R-XXXXXX`
 *  - URL legacy: `…/reserva/R-XXXXXX?token=…` o `…?token=UUID`
 *  - UUID legacy puro
 */
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

/* ─────────────── Cámara QR ─────────────── */
function QrCamera({ onScan }: { onScan: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [camError, setCamError] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    type BarcodeDetectorType = { detect: (el: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
    const detector: BarcodeDetectorType | null = 'BarcodeDetector' in window
      ? new (window as unknown as { BarcodeDetector: new (o: object) => BarcodeDetectorType }).BarcodeDetector({ formats: ['qr_code'] })
      : null;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
        }
        tick();
      })
      .catch(() => setCamError('No se pudo acceder a la cámara. Usa la entrada manual.'));

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== 4) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);

      if (detector) {
        detector.detect(video).then((codes) => {
          if (codes.length > 0) {
            onScan(codes[0].rawValue);
          }
        }).catch(() => {});
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onScan]);

  if (camError) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {camError}
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-square max-w-sm mx-auto shadow-inner">
      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
      {/* Marco de visor con esquinas */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-56 h-56">
          <span className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
          <span className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
          <span className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
          <span className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
          {/* Línea de escaneo */}
          <span className="absolute left-2 right-2 top-1/2 h-0.5 bg-emerald-400/80 shadow-[0_0_12px_2px_rgba(52,211,153,0.7)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Resultado de la validación ─────────────── */
function ReservationResult({
  reservation,
  onMarkUsed,
  onReset,
  marking,
}: {
  reservation: PopulatedReservation;
  onMarkUsed: () => void;
  onReset: () => void;
  marking: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[reservation.status]}`}>
          {STATUS_LABEL[reservation.status]}
        </span>
        <span className="font-mono text-sm text-slate-500 tracking-wider">
          {reservation.reservationCode}
        </span>
      </div>

      <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 p-4 space-y-2.5 text-sm mb-5">
        <InfoRow label="Cancha" value={reservation.courtId.name} />
        <InfoRow label="Sede" value={reservation.courtId.location} />
        <InfoRow label="Fecha" value={reservation.date} />
        <InfoRow label="Horario" value={`${reservation.startTime} – ${reservation.endTime}`} />
        <div className="border-t border-slate-200 pt-2.5">
          <InfoRow label="Usuario" value={reservation.userId.name} />
          <InfoRow label="Email" value={reservation.userId.email} />
        </div>
      </div>

      {reservation.status === 'approved' ? (
        <button
          onClick={onMarkUsed}
          disabled={marking}
          className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold text-base hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
        >
          {marking ? 'Procesando...' : '✓ Marcar como utilizada'}
        </button>
      ) : (
        <div className={`text-center py-3 rounded-xl text-sm font-semibold ${
          reservation.status === 'used'
            ? 'bg-slate-100 text-slate-600'
            : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
        }`}>
          {reservation.status === 'used'
            ? 'Esta reserva ya fue utilizada'
            : 'Esta reserva no está activa'}
        </div>
      )}

      <button
        onClick={onReset}
        className="mt-4 w-full text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        ← Validar otro código
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-800 font-medium text-right truncate">{value}</span>
    </div>
  );
}

/* ─────────────── Página principal ─────────────── */
export default function QrValidator() {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualInput, setManualInput] = useState('');
  const [reservation, setReservation] = useState<PopulatedReservation | null>(null);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState('');

  const validate = useCallback(async (raw: string) => {
    const code = extractCode(raw);
    if (!code) {
      setError('Código inválido o formato no reconocido');
      return;
    }

    setLoading(true);
    setError('');
    setReservation(null);

    try {
      const res = await api.get<{ success: boolean; data: PopulatedReservation }>(
        `/api/admin/qr/${encodeURIComponent(code)}`
      );
      setReservation(res.data.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Código no encontrado o inválido');
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleMarkUsed() {
    if (!reservation) return;
    const code = reservation.reservationCode;

    setMarking(true);
    try {
      await api.post(`/api/admin/qr/${encodeURIComponent(code)}/use`, {});
      setReservation((r) => r ? { ...r, status: 'used' as IReservation['status'] } : r);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Error al marcar como utilizada');
    } finally {
      setMarking(false);
    }
  }

  function reset() {
    setReservation(null);
    setError('');
    setManualInput('');
  }

  return (
    <div className="max-w-lg mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Validar reserva</h1>
        <p className="text-slate-500 text-sm mt-1">
          Escanea el QR del usuario o ingresa su código manualmente.
        </p>
      </header>

      {/* Mode toggle */}
      <div className="inline-flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => { setMode('camera'); reset(); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            mode === 'camera' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          📷 Cámara
        </button>
        <button
          onClick={() => { setMode('manual'); reset(); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            mode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          ⌨️ Manual
        </button>
      </div>

      {!reservation && !loading && (
        <>
          {mode === 'camera' ? (
            <div className="mb-6">
              <QrCamera onScan={validate} />
              <p className="text-center text-xs text-slate-400 mt-3">
                Apunta la cámara hacia el QR del usuario
              </p>
            </div>
          ) : (
            <div className="mb-6 bg-white rounded-2xl ring-1 ring-slate-200 p-5 shadow-sm">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Código de reserva
              </label>
              <p className="text-xs text-slate-400 mb-3">
                Ej: <span className="font-mono">R-A3F2B1</span>
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                  placeholder="R-XXXXXX"
                  className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent uppercase"
                  onKeyDown={(e) => e.key === 'Enter' && validate(manualInput)}
                />
                <button
                  onClick={() => validate(manualInput)}
                  disabled={!manualInput.trim()}
                  className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  Validar
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 ring-1 ring-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3" />
          <p className="text-slate-400 text-sm">Verificando código...</p>
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
