import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { ICourt } from '../types';
import api from '../lib/api';
import CourtAvailabilityTimeline from '../components/CourtAvailabilityTimeline';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function CourtDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [court, setCourt] = useState<ICourt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get<{ success: boolean; data: ICourt }>(`/api/courts/${id}`);
      setCourt(res.data.data);
    } catch {
      setError('No se pudo cargar la cancha');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDeactivate() {
    if (!court) return;
    if (!confirm(`¿Desactivar la cancha "${court.name}"?`)) return;
    try {
      await api.delete(`/api/courts/${court._id}`);
      navigate('/canchas');
    } catch {
      alert('Error al desactivar');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
      </div>
    );
  }

  if (error || !court) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
        <p className="text-sm text-red-600">{error || 'Cancha no encontrada'}</p>
        <Link to="/canchas" className="inline-block mt-3 text-sm font-medium text-red-700 underline">
          Volver a canchas
        </Link>
      </div>
    );
  }

  const images = court.images ?? [];
  const hero = images[activeImage];
  const slots = court.availableSlots ?? [];
  const mapsLink = court.coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${court.coordinates.lat},${court.coordinates.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(court.location)}`;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/canchas" className="text-gray-400 hover:text-gray-700 transition-colors">
          Canchas
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium truncate">{court.name}</span>
      </div>

      {/* Hero card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="relative h-56 sm:h-72 bg-gradient-to-br from-green-50 to-green-100">
          {hero ? (
            <img src={hero} alt={court.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl opacity-30">⚽</div>
          )}
          {!court.isActive && (
            <span className="absolute top-4 left-4 text-xs font-semibold bg-gray-900/80 text-white px-3 py-1 rounded-full">
              Inactiva
            </span>
          )}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => navigate(`/canchas/${court._id}/editar`)}
              className="bg-white/95 backdrop-blur text-gray-900 text-sm font-semibold px-4 py-2 rounded-xl shadow hover:bg-white transition-colors"
            >
              Editar
            </button>
            {court.isActive && (
              <button
                onClick={handleDeactivate}
                className="bg-white/95 backdrop-blur text-red-600 text-sm font-semibold px-4 py-2 rounded-xl shadow hover:bg-white transition-colors"
              >
                Desactivar
              </button>
            )}
          </div>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="px-5 pt-4 flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={img}
                onClick={() => setActiveImage(i)}
                className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                  i === activeImage ? 'border-green-600 ring-2 ring-green-100' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Título + meta */}
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{court.name}</h1>
              <a
                href={mapsLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-700 transition-colors mt-1"
              >
                <span>📍</span>
                <span className="truncate">{court.location}</span>
                {court.coordinates && <span className="text-xs text-green-600 ml-1">· Ver en mapa ↗</span>}
              </a>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600 leading-none">S/ {court.pricePerHour}</p>
              <p className="text-xs text-gray-400 mt-0.5">por hora</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Turnos" value={String(slots.length)} hint={slots.length === 1 ? 'ventana' : 'ventanas'} />
        <Tile label="Fotos" value={String(images.length)} hint={images.length === 1 ? 'imagen' : 'imágenes'} />
        <Tile
          label="Estado"
          value={court.isActive ? 'Activa' : 'Inactiva'}
          accent={court.isActive ? 'green' : 'gray'}
        />
        <Tile label="Creada" value={formatDate(court.createdAt)} small />
      </div>

      {/* Descripción + Horarios side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Descripción */}
        <section className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Descripción</h2>
          {court.description ? (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{court.description}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">Sin descripción registrada.</p>
          )}
        </section>

        {/* Horarios */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Horarios</h2>
          {slots.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Sin horarios configurados.</p>
          ) : (
            <ul className="space-y-2">
              {slots.map((s, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between bg-green-50/60 border border-green-100 rounded-lg px-3 py-2 text-sm"
                >
                  <span className="font-mono text-green-800">
                    {s.startTime} – {s.endTime}
                  </span>
                  <span className="text-xs text-green-700 font-medium">Turno {i + 1}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Ocupación */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Ocupación</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Consulta qué horas están reservadas y cuáles siguen libres por día.
            </p>
          </div>
        </div>
        <CourtAvailabilityTimeline courtId={court._id} operatingWindows={slots} />
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  accent,
  small,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: 'green' | 'gray';
  small?: boolean;
}) {
  const valueColor =
    accent === 'green' ? 'text-green-600' : accent === 'gray' ? 'text-gray-500' : 'text-gray-900';
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`${small ? 'text-sm' : 'text-xl'} font-bold mt-1 ${valueColor}`}>{value}</p>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}
