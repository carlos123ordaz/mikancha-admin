import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ICourt } from '../types';
import api from '../lib/api';

export default function Courts() {
  const navigate = useNavigate();
  const [courts, setCourts] = useState<ICourt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: ICourt[] }>('/api/courts');
      setCourts(res.data.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courts;
    return courts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q)
    );
  }, [courts, search]);

  const activeCount = courts.filter((c) => c.isActive).length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Canchas</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {courts.length} registrada{courts.length === 1 ? '' : 's'}
            {courts.length > 0 && (
              <>
                {' · '}
                <span className="text-green-600 font-medium">{activeCount} activa{activeCount === 1 ? '' : 's'}</span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => navigate('/canchas/nueva')}
          className="bg-green-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-green-700 active:bg-green-800 transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <span className="text-base leading-none">+</span>
          Nueva cancha
        </button>
      </div>

      {/* Search */}
      {courts.length > 0 && (
        <div className="mb-5">
          <div className="relative max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
              🔍
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, dirección o descripción..."
              className="input w-full pl-9"
            />
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : courts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="text-5xl mb-3 opacity-60">⚽</div>
          <p className="text-gray-500 font-medium">No hay canchas registradas</p>
          <p className="text-gray-400 text-xs mt-1">Comienza creando tu primera cancha.</p>
          <button
            onClick={() => navigate('/canchas/nueva')}
            className="mt-5 bg-green-600 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors"
          >
            + Crear la primera cancha
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">
          Sin resultados para "<span className="text-gray-600">{search}</span>".
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((court) => (
            <CourtCard
              key={court._id}
              court={court}
              onOpen={() => navigate(`/canchas/${court._id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CourtCard({ court, onOpen }: { court: ICourt; onOpen: () => void }) {
  const slotCount = court.availableSlots?.length ?? 0;
  const imageCount = court.images?.length ?? 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 hover:border-green-200 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
    >
      {/* Imagen / portada */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 h-40 flex items-center justify-center overflow-hidden relative">
        {court.images?.[0] ? (
          <img
            src={court.images[0]}
            alt={court.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <span className="text-5xl opacity-30">⚽</span>
        )}

        {/* Badges sobre la imagen */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          {!court.isActive && (
            <span className="text-[10px] bg-gray-900/80 text-white px-2 py-0.5 rounded-full font-semibold backdrop-blur">
              Inactiva
            </span>
          )}
        </div>
        {imageCount > 1 && (
          <span className="absolute bottom-2.5 right-2.5 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full backdrop-blur">
            {imageCount} fotos
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-gray-900 truncate group-hover:text-green-700 transition-colors">
            {court.name}
          </h3>
          <span className="flex-shrink-0 text-green-600 font-bold text-sm">
            S/ {court.pricePerHour}
          </span>
        </div>

        <p className="text-xs text-gray-400 mb-3 truncate flex items-center gap-1">
          <span>📍</span>
          {court.location}
        </p>

        {/* Horarios */}
        <div className="flex flex-wrap gap-1 min-h-[24px]">
          {slotCount === 0 ? (
            <span className="text-xs text-gray-300 italic">Sin horarios</span>
          ) : (
            <>
              {court.availableSlots.slice(0, 3).map((s, i) => (
                <span
                  key={i}
                  className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium"
                >
                  {s.startTime}–{s.endTime}
                </span>
              ))}
              {slotCount > 3 && (
                <span className="text-xs text-gray-400 self-center">+{slotCount - 3} más</span>
              )}
            </>
          )}
        </div>

        {/* Footer con hint de navegación */}
        <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
          <span className="text-gray-400">Ver detalle y ocupación</span>
          <span className="text-green-600 font-semibold group-hover:translate-x-0.5 transition-transform">
            →
          </span>
        </div>
      </div>
    </button>
  );
}
