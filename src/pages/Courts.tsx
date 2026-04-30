import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ICourt } from '../types';
import api from '../lib/api';

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
  search:  ICO(<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>),
  plus:    ICO(<><path d="M12 5v14M5 12h14"/></>, 2),
  pin:     ICO(<><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13Z"/><circle cx="12" cy="9" r="2.5"/></>),
  clock:   ICO(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>),
  chevR:   ICO(<><path d="m9 6 6 6-6 6"/></>),
};

const COURT_COLORS: Record<string, string> = {
  futbol:    'oklch(0.55 0.15 145)',
  tenis:     'oklch(0.55 0.14 280)',
  padel:     'oklch(0.55 0.14 220)',
  basquet:   'oklch(0.55 0.15 45)',
  voley:     'oklch(0.55 0.14 190)',
};

function getCourtColor(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, color] of Object.entries(COURT_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return 'oklch(0.5 0.14 155)';
}

/* Court image placeholder */
function CourtImg({ name, height = 160 }: { name: string; height?: number }) {
  const color = getCourtColor(name);
  return (
    <div style={{
      height, width: '100%', borderRadius: '10px 10px 0 0', overflow: 'hidden',
      background: `linear-gradient(135deg, ${color} 0%, color-mix(in oklch, ${color}, black 50%) 100%)`,
      border: '1px solid var(--border)', position: 'relative',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 24px)' }} />
      <svg viewBox="0 0 200 100" preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.45 }}>
        <rect x="6" y="6" width="188" height="88" fill="none" stroke="white" strokeWidth="0.6" />
        <line x1="100" y1="6" x2="100" y2="94" stroke="white" strokeWidth="0.5" />
        <circle cx="100" cy="50" r="14" fill="none" stroke="white" strokeWidth="0.5" />
        <rect x="6" y="32" width="20" height="36" fill="none" stroke="white" strokeWidth="0.5" />
        <rect x="174" y="32" width="20" height="36" fill="none" stroke="white" strokeWidth="0.5" />
      </svg>
    </div>
  );
}

function CourtCard({ court, onOpen }: { court: ICourt; onOpen: () => void }) {
  const [hovered, setHovered] = useState(false);
  const slotCount = court.availableSlots?.length ?? 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-elev)',
        border: `1px solid ${hovered ? 'var(--border-strong)' : 'var(--border)'}`,
        borderRadius: 12, overflow: 'hidden',
        textAlign: 'left', cursor: 'pointer',
        transition: 'all 150ms ease',
        boxShadow: hovered ? '0 4px 20px rgba(0,0,0,0.25)' : 'none',
        transform: hovered ? 'translateY(-1px)' : 'none',
        width: '100%',
      }}
    >
      {/* Image */}
      {court.images?.[0] ? (
        <div style={{ height: 160, overflow: 'hidden', borderRadius: '10px 10px 0 0' }}>
          <img
            src={court.images[0]}
            alt={court.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              transform: hovered ? 'scale(1.04)' : 'scale(1)', transition: 'transform 300ms' }}
          />
        </div>
      ) : (
        <CourtImg name={court.name} height={160} />
      )}

      {/* Status badge */}
      {!court.isActive && (
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', top: -148, left: 10,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
          }}>Inactiva</span>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.3 }}>
            {court.name}
          </div>
          <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', flexShrink: 0 }}>
            S/ {court.pricePerHour}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--fg-faint)', marginBottom: 12 }}>
          {Icons.pin(13)}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {court.location}
          </span>
        </div>

        {/* Slots */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, minHeight: 24 }}>
          {slotCount === 0 ? (
            <span style={{ fontSize: 11, color: 'var(--fg-faint)', fontStyle: 'italic' }}>Sin horarios</span>
          ) : (
            <>
              {court.availableSlots.slice(0, 3).map((s, i) => (
                <span key={i} style={{
                  fontSize: 11, background: 'var(--accent-soft)', color: 'var(--accent)',
                  padding: '2px 8px', borderRadius: 999, fontWeight: 500,
                }}>
                  {s.startTime}–{s.endTime}
                </span>
              ))}
              {slotCount > 3 && (
                <span style={{ fontSize: 11, color: 'var(--fg-faint)', alignSelf: 'center' }}>
                  +{slotCount - 3} más
                </span>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 14, paddingTop: 12,
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: 'var(--fg-faint)' }}>Ver detalle y ocupación</span>
          <span style={{ color: 'var(--accent)', transition: 'transform 100ms', transform: hovered ? 'translateX(2px)' : 'none' }}>
            {Icons.chevR(14)}
          </span>
        </div>
      </div>
    </button>
  );
}

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
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courts;
    return courts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q)
    );
  }, [courts, search]);

  const activeCount = courts.filter(c => c.isActive).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--fg-faint)', marginTop: 4 }}>
            {courts.length} registrada{courts.length === 1 ? '' : 's'}
            {courts.length > 0 && (
              <> · <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{activeCount} activa{activeCount === 1 ? '' : 's'}</span></>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate('/canchas/nueva')}
          className="btn-primary"
        >
          {Icons.plus(15)} Nueva cancha
        </button>
      </div>

      {/* Search */}
      {courts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ position: 'relative', maxWidth: 360 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-faint)' }}>
              {Icons.search(15)}
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, dirección o descripción..."
              className="input"
              style={{ paddingLeft: 34 }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : courts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px', borderStyle: 'dashed' }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>⚽</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-muted)', marginBottom: 6 }}>
            No hay canchas registradas
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-faint)', marginBottom: 20 }}>
            Comienza creando tu primera cancha.
          </div>
          <button onClick={() => navigate('/canchas/nueva')} className="btn-primary">
            {Icons.plus(15)} Crear la primera cancha
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--fg-faint)', fontSize: 13 }}>
          Sin resultados para "<span style={{ color: 'var(--fg-muted)' }}>{search}</span>".
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(court => (
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
