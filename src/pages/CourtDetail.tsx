import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { ICourt } from '../types';
import api from '../lib/api';
import CourtAvailabilityTimeline from '../components/CourtAvailabilityTimeline';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return iso; }
}

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
  pin:    ICO(<><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13Z"/><circle cx="12" cy="9" r="2.5"/></>),
  clock:  ICO(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>),
  edit:   ICO(<><path d="M4 20h4l11-11-4-4L4 16v4ZM14 5l4 4"/></>),
  trash:  ICO(<><path d="M3 6h18M9 6V4h6v2M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"/></>),
  chevL:  ICO(<><path d="m15 6-6 6 6 6"/></>),
  external: ICO(<><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></>),
};

const COURT_COLORS: Record<string, string> = {
  futbol: 'oklch(0.55 0.15 145)', tenis: 'oklch(0.55 0.14 280)',
  padel: 'oklch(0.55 0.14 220)', basquet: 'oklch(0.55 0.15 45)',
  voley: 'oklch(0.55 0.14 190)',
};
function getCourtColor(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, color] of Object.entries(COURT_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return 'oklch(0.5 0.14 155)';
}

function CourtImgPlaceholder({ name, height = 240 }: { name: string; height?: number }) {
  const color = getCourtColor(name);
  return (
    <div style={{
      height, width: '100%', overflow: 'hidden',
      background: `linear-gradient(135deg, ${color} 0%, color-mix(in oklch, ${color}, black 50%) 100%)`,
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 24px)' }} />
      <svg viewBox="0 0 400 200" preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}>
        <rect x="8" y="8" width="384" height="184" fill="none" stroke="white" strokeWidth="1"/>
        <line x1="200" y1="8" x2="200" y2="192" stroke="white" strokeWidth="0.8"/>
        <circle cx="200" cy="100" r="28" fill="none" stroke="white" strokeWidth="0.8"/>
        <rect x="8" y="64" width="36" height="72" fill="none" stroke="white" strokeWidth="0.8"/>
        <rect x="356" y="64" width="36" height="72" fill="none" stroke="white" strokeWidth="0.8"/>
      </svg>
    </div>
  );
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
    setLoading(true); setError('');
    try {
      const res = await api.get<{ success: boolean; data: ICourt }>(`/api/courts/${id}`);
      setCourt(res.data.data);
    } catch { setError('No se pudo cargar la cancha'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleDeactivate() {
    if (!court) return;
    if (!confirm(`¿Desactivar la cancha "${court.name}"?`)) return;
    try { await api.delete(`/api/courts/${court._id}`); navigate('/canchas'); }
    catch { alert('Error al desactivar'); }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  if (error || !court) {
    return (
      <div className="card" style={{ maxWidth: 480, margin: '40px auto', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 12 }}>{error || 'Cancha no encontrada'}</div>
        <Link to="/canchas" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>
          ← Volver a canchas
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <Link to="/canchas" style={{ color: 'var(--fg-faint)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          {Icons.chevL(14)} Canchas
        </Link>
        <span style={{ color: 'var(--border-strong)' }}>/</span>
        <span style={{ color: 'var(--fg-muted)', fontWeight: 500 }}>{court.name}</span>
      </div>

      {/* Hero card */}
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        {/* Image */}
        <div style={{ position: 'relative' }}>
          {hero ? (
            <img src={hero} alt={court.name} style={{ width: '100%', maxHeight: 280, minHeight: 160, objectFit: 'cover', display: 'block' }} />
          ) : (
            <CourtImgPlaceholder name={court.name} height={220} />
          )}
          {!court.isActive && (
            <span style={{
              position: 'absolute', top: 14, left: 14,
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
              color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: 600,
              padding: '3px 10px', borderRadius: 999,
            }}>Inactiva</span>
          )}
          <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate(`/canchas/${court._id}/editar`)}
              className="btn-secondary"
              style={{ height: 32, padding: '0 12px', fontSize: 12, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
            >
              {Icons.edit(14)} Editar
            </button>
            {court.isActive && (
              <button onClick={handleDeactivate} className="btn-danger" style={{ height: 32, padding: '0 12px', fontSize: 12, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', borderColor: 'rgba(255,255,255,0.15)' }}>
                {Icons.trash(14)} Desactivar
              </button>
            )}
          </div>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div style={{ padding: '14px 20px 0', display: 'flex', gap: 8, overflowX: 'auto' }}>
            {images.map((img, i) => (
              <button key={img} onClick={() => setActiveImage(i)} style={{
                flexShrink: 0, width: 72, height: 52, borderRadius: 8, overflow: 'hidden',
                border: `2px solid ${i === activeImage ? 'var(--accent)' : 'var(--border)'}`,
                opacity: i === activeImage ? 1 : 0.6, cursor: 'pointer',
                transition: 'all 120ms',
              }}>
                <img src={img} alt={`Foto ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>
        )}

        {/* Court info */}
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{court.name}</div>
              <a href={mapsLink} target="_blank" rel="noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 13, color: 'var(--fg-faint)', textDecoration: 'none',
                marginTop: 6, transition: 'color 120ms',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-faint)')}
              >
                {Icons.pin(14)} {court.location}
                {court.coordinates && <span style={{ color: 'var(--accent)', fontSize: 11 }}>{Icons.external(12)}</span>}
              </a>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>
                S/ {court.pricePerHour}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 4 }}>por hora</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats tiles */}
      <div className="grid-tiles-4">
        {[
          { label: 'Turnos',  value: String(slots.length),   hint: slots.length === 1 ? 'ventana' : 'ventanas' },
          { label: 'Fotos',   value: String(images.length),  hint: images.length === 1 ? 'imagen' : 'imágenes' },
          { label: 'Estado',  value: court.isActive ? 'Activa' : 'Inactiva', accent: court.isActive },
          { label: 'Creada',  value: formatDate(court.createdAt), small: true },
        ].map(tile => (
          <div key={tile.label} className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-faint)', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 }}>
              {tile.label}
            </div>
            <div style={{
              fontSize: tile.small ? 13 : 20, fontWeight: 700,
              color: 'accent' in tile ? (tile.accent ? 'var(--accent)' : 'var(--fg-faint)') : 'var(--fg)',
            }}>
              {tile.value}
            </div>
            {tile.hint && <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 2 }}>{tile.hint}</div>}
          </div>
        ))}
      </div>

      {/* Description + Slots */}
      <div className="grid-detail-2col">
        {/* Description */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-faint)', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 14 }}>
            Descripción
          </div>
          {court.description ? (
            <p style={{ fontSize: 13.5, color: 'var(--fg-muted)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {court.description}
            </p>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--fg-faint)', fontStyle: 'italic' }}>Sin descripción registrada.</p>
          )}
        </div>

        {/* Slots */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-faint)', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 14 }}>
            Horarios disponibles
          </div>
          {slots.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--fg-faint)', fontStyle: 'italic' }}>Sin horarios configurados.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {slots.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--accent-soft)', border: '1px solid var(--accent-soft-strong)',
                  borderRadius: 8, padding: '8px 12px',
                }}>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)' }}>
                    {s.startTime} – {s.endTime}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--fg-faint)' }}>Turno {i + 1}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ocupación */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Ocupación</div>
          <div style={{ fontSize: 12, color: 'var(--fg-faint)', marginTop: 4 }}>
            Consulta qué horas están reservadas y cuáles siguen libres por día.
          </div>
        </div>
        <CourtAvailabilityTimeline courtId={court._id} operatingWindows={slots} />
      </div>
    </div>
  );
}
