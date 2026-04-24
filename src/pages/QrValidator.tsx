import { useState, useEffect, useRef, useCallback } from 'react';
import type { IReservation, ICourt, IUser } from '../types';
import api from '../lib/api';

type PopulatedReservation = Omit<IReservation, 'userId' | 'courtId'> & {
  userId: IUser;
  courtId: ICourt;
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  used: 'bg-gray-100 text-gray-700',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada ✓',
  rejected: 'Rechazada',
  used: 'Ya utilizada',
};

/* Extrae el qrToken desde una URL o lo usa directamente si es UUID */
function extractToken(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.searchParams.get('token');
  } catch {
    // No es URL — chequear si parece un UUID
    return /^[0-9a-f-]{36}$/i.test(raw.trim()) ? raw.trim() : null;
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

      // Usa BarcodeDetector si está disponible (Chrome 83+, Edge 83+)
      if ('BarcodeDetector' in window) {
        const detector = new (window as unknown as { BarcodeDetector: new (o: object) => { detect: (el: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector({ formats: ['qr_code'] });
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
    return <p className="text-sm text-yellow-700 bg-yellow-50 rounded-xl p-4">{camError}</p>;
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-sm mx-auto">
      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
      {/* Visor */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-52 h-52 border-4 border-white/70 rounded-2xl" />
      </div>
    </div>
  );
}

/* ─────────────── Resultado del QR ─────────────── */
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
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_BADGE[reservation.status]}`}>
          {STATUS_LABEL[reservation.status]}
        </span>
        <span className="font-mono text-sm text-gray-400">{reservation.reservationCode}</span>
      </div>

      <div className="space-y-2.5 text-sm mb-5">
        <InfoRow label="Cancha" value={reservation.courtId.name} />
        <InfoRow label="Sede" value={reservation.courtId.location} />
        <InfoRow label="Fecha" value={reservation.date} />
        <InfoRow label="Horario" value={`${reservation.startTime} – ${reservation.endTime}`} />
        <div className="border-t border-gray-100 pt-2.5">
          <InfoRow label="Usuario" value={reservation.userId.name} />
        </div>
      </div>

      {reservation.status === 'approved' ? (
        <button
          onClick={onMarkUsed}
          disabled={marking}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-base hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {marking ? 'Procesando...' : '✓ Marcar como usada'}
        </button>
      ) : (
        <div className={`text-center py-3 rounded-xl text-sm font-semibold ${
          reservation.status === 'used'
            ? 'bg-gray-100 text-gray-600'
            : 'bg-red-50 text-red-700'
        }`}>
          {reservation.status === 'used'
            ? 'Esta reserva ya fue utilizada'
            : 'Esta reserva no está activa'}
        </div>
      )}

      <button
        onClick={onReset}
        className="mt-3 w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        Escanear otro QR
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-800 font-medium text-right">{value}</span>
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
    const token = extractToken(raw);
    if (!token) {
      setError('QR inválido o formato no reconocido');
      return;
    }

    setLoading(true);
    setError('');
    setReservation(null);

    try {
      const res = await api.get<{ success: boolean; data: PopulatedReservation }>(
        `/api/admin/qr/${token}`
      );
      setReservation(res.data.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'QR no encontrado o inválido');
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleMarkUsed() {
    if (!reservation) return;
    const token = reservation.qrToken;
    if (!token) return;

    setMarking(true);
    try {
      await api.post(`/api/admin/qr/${token}/use`, {});
      setReservation((r) => r ? { ...r, status: 'used' as IReservation['status'] } : r);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Error al marcar como usada');
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
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Validar QR</h1>
      <p className="text-gray-400 text-sm mb-6">
        Escanea el código QR del usuario o ingresa el token manualmente
      </p>

      {/* Mode toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => { setMode('camera'); reset(); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'camera' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          📷 Cámara
        </button>
        <button
          onClick={() => { setMode('manual'); reset(); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
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
              <p className="text-center text-xs text-gray-400 mt-3">
                Apunta la cámara al QR del usuario
              </p>
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token QR o URL completa
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="UUID del token o URL del QR..."
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  onKeyDown={(e) => e.key === 'Enter' && validate(manualInput)}
                />
                <button
                  onClick={() => validate(manualInput)}
                  disabled={!manualInput.trim()}
                  className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  Validar
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-3" />
          <p className="text-gray-400 text-sm">Verificando QR...</p>
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
