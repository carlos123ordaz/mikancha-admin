import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { ICourt, TimeSlot } from '../types';
import api from '../lib/api';

declare global {
  interface Window {
    google: typeof google;
  }
}

interface CourtFormData {
  name: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  pricePerHour: string;
  description: string;
  availableSlots: TimeSlot[];
}

const DEFAULT_DESCRIPTION =
  '<p><strong>Descripción:</strong> 4 Canchas de Futbol 7, 2 Canchas de Voley.</p>' +
  '<p><strong>Incluye:</strong> Chalecos, Pelotas</p>' +
  '<p><strong>Tribuna:</strong> Para 100 personas y Areas sociales.</p>' +
  '<p><strong>Estacionamiento interno:</strong> Para 100 vehículos, vigilado.</p>' +
  '<p><strong>Servicios higiénicos:</strong> Damas y Caballeros</p>';

const EMPTY_FORM: CourtFormData = {
  name: '',
  location: '',
  pricePerHour: '',
  description: DEFAULT_DESCRIPTION,
  availableSlots: [],
};

const SCHEDULE_PRESETS = [
  { label: 'Mañana', icon: '🌅', slots: [{ startTime: '07:00', endTime: '12:00' }] },
  { label: 'Tarde', icon: '☀️', slots: [{ startTime: '12:00', endTime: '18:00' }] },
  { label: 'Noche', icon: '🌙', slots: [{ startTime: '18:00', endTime: '22:00' }] },
  {
    label: 'Día completo',
    icon: '📅',
    slots: [
      { startTime: '07:00', endTime: '12:00' },
      { startTime: '12:00', endTime: '18:00' },
      { startTime: '18:00', endTime: '22:00' },
    ],
  },
];

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.maps?.places) {
      resolve();
      return;
    }
    const existing = document.getElementById('gm-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.id = 'gm-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Maps no disponible'));
    document.head.appendChild(script);
  });
}

function slotDuration(slot: TimeSlot): string {
  if (!slot.startTime || !slot.endTime) return '';
  const [sh, sm] = slot.startTime.split(':').map(Number);
  const [eh, em] = slot.endTime.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
}

/* ─── Editor de texto enriquecido ─── */
function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, code: false, codeBlock: false, blockquote: false, horizontalRule: false }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  const tbBtnStyle = (active: boolean): React.CSSProperties => ({
    width: 28, height: 28, borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: active ? 'var(--accent-soft)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--fg-muted)',
    border: 'none', cursor: 'pointer', transition: 'all 100ms',
  });

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
      transition: 'border-color 120ms',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '8px 10px', background: 'var(--bg-elev-2)', borderBottom: '1px solid var(--border)' }}>
        <button type="button" title="Negrita" onClick={() => editor.chain().focus().toggleBold().run()} style={{ ...tbBtnStyle(editor.isActive('bold')), fontWeight: 700, fontSize: 13 }}>
          B
        </button>
        <button type="button" title="Cursiva" onClick={() => editor.chain().focus().toggleItalic().run()} style={{ ...tbBtnStyle(editor.isActive('italic')), fontStyle: 'italic', fontSize: 13 }}>
          I
        </button>
        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
        <button type="button" title="Lista con viñetas" onClick={() => editor.chain().focus().toggleBulletList().run()} style={tbBtnStyle(editor.isActive('bulletList'))}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
            <line x1="9" y1="6" x2="20" y2="6" strokeLinecap="round" />
            <line x1="9" y1="12" x2="20" y2="12" strokeLinecap="round" />
            <line x1="9" y1="18" x2="20" y2="18" strokeLinecap="round" />
          </svg>
        </button>
        <button type="button" title="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()} style={tbBtnStyle(editor.isActive('orderedList'))}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <line x1="10" y1="6" x2="20" y2="6" strokeLinecap="round" />
            <line x1="10" y1="12" x2="20" y2="12" strokeLinecap="round" />
            <line x1="10" y1="18" x2="20" y2="18" strokeLinecap="round" />
            <text x="2" y="8" fontSize="7" fill="currentColor" stroke="none" fontWeight="bold">1.</text>
            <text x="2" y="14" fontSize="7" fill="currentColor" stroke="none" fontWeight="bold">2.</text>
            <text x="2" y="20" fontSize="7" fill="currentColor" stroke="none" fontWeight="bold">3.</text>
          </svg>
        </button>
      </div>
      <EditorContent
        editor={editor}
        className="[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[120px] [&_.ProseMirror]:p-3 [&_.ProseMirror]:text-sm [&_.ProseMirror_p]:mb-1.5 [&_.ProseMirror_p:last-child]:mb-0 [&_.ProseMirror_strong]:font-semibold [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ul]:mb-1.5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ol]:mb-1.5 [&_.ProseMirror_li]:mb-0.5"
        style={{ color: 'var(--fg-muted)' }}
      />
    </div>
  );
}

/* ─── Componente de sección ─── */
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="card" style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-faint)', textTransform: 'uppercase', letterSpacing: 0.7 }}>{title}</div>
        {subtitle && <p style={{ fontSize: 12, color: 'var(--fg-faint)', marginTop: 4 }}>{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--fg-muted)', marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 6 }}>{hint}</p>}
    </div>
  );
}

/* ─── Página principal ─── */
export default function CourtForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<CourtFormData>(EMPTY_FORM);
  const [court, setCourt] = useState<ICourt | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [mapsReady, setMapsReady] = useState(false);

  const locationRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Cargar datos de la cancha si estamos editando
  useEffect(() => {
    if (!isEdit) return;
    api
      .get<{ success: boolean; data: ICourt }>(`/api/courts/${id}`)
      .then((res) => {
        const c = res.data.data;
        setCourt(c);
        setForm({
          name: c.name,
          location: c.location,
          coordinates: c.coordinates,
          pricePerHour: String(c.pricePerHour),
          description: c.description ?? '',
          availableSlots: c.availableSlots ?? [],
        });
      })
      .catch(() => setError('No se pudo cargar la cancha'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // Inicializar Google Maps Places Autocomplete
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || loading || !locationRef.current) return;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (!locationRef.current) return;
        const ac = new window.google.maps.places.Autocomplete(locationRef.current, {
          componentRestrictions: { country: 'pe' },
        });
        autocompleteRef.current = ac;
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          if (!place?.geometry?.location) return;
          setForm((f) => ({
            ...f,
            location: place.formatted_address ?? f.location,
            coordinates: {
              lat: place.geometry!.location!.lat(),
              lng: place.geometry!.location!.lng(),
            },
          }));
        });
        setMapsReady(true);
      })
      .catch(() => {/* Google Maps no disponible, continuar sin él */});

    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [loading]);

  function addSlot() {
    setForm((f) => ({
      ...f,
      availableSlots: [...f.availableSlots, { startTime: '', endTime: '' }],
    }));
  }

  function updateSlot(index: number, field: keyof TimeSlot, value: string) {
    setForm((f) => {
      const slots = [...f.availableSlots];
      slots[index] = { ...slots[index], [field]: value };
      return { ...f, availableSlots: slots };
    });
  }

  function removeSlot(index: number) {
    setForm((f) => ({
      ...f,
      availableSlots: f.availableSlots.filter((_, i) => i !== index),
    }));
  }

  function applyPreset(preset: (typeof SCHEDULE_PRESETS)[number]) {
    setForm((f) => ({ ...f, availableSlots: preset.slots.map((s) => ({ ...s })) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        location: form.location,
        coordinates: form.coordinates,
        pricePerHour: Number(form.pricePerHour),
        description: form.description,
        availableSlots: form.availableSlots.filter((s) => s.startTime && s.endTime),
      };
      if (isEdit) {
        await api.put(`/api/courts/${id}`, payload);
        navigate('/canchas');
      } else {
        const res = await api.post<{ success: boolean; data: ICourt }>('/api/courts', payload);
        // Redirigir a editar para agregar imágenes
        navigate(`/canchas/${res.data.data._id}/editar`);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const files = Array.from(input.files ?? []);
    if (files.length === 0 || !id) {
      input.value = '';
      return;
    }

    const currentCount = court?.images?.length ?? 0;
    const remaining = Math.max(0, 5 - currentCount);
    const toUpload = files.slice(0, remaining);
    const skipped = files.length - toUpload.length;

    if (toUpload.length === 0) {
      setError('Ya alcanzaste el máximo de 5 fotos.');
      input.value = '';
      return;
    }

    setError('');
    setUploadingImage(true);
    setUploadProgress({ current: 0, total: toUpload.length });

    try {
      for (let i = 0; i < toUpload.length; i++) {
        setUploadProgress({ current: i + 1, total: toUpload.length });
        const fd = new FormData();
        fd.append('image', toUpload[i]);
        const res = await api.post<{ success: boolean; data: { images: string[] } }>(
          `/api/courts/${id}/images`,
          fd,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        setCourt((c) => (c ? { ...c, images: res.data.data.images } : c));
      }
      if (skipped > 0) {
        setError(`Se subieron ${toUpload.length} foto${toUpload.length === 1 ? '' : 's'}. ${skipped} omitida${skipped === 1 ? '' : 's'} por el límite de 5.`);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Error al subir la imagen');
    } finally {
      setUploadingImage(false);
      setUploadProgress(null);
      input.value = '';
    }
  }

  async function handleImageDelete(index: number) {
    if (!id || !confirm('¿Eliminar esta imagen?')) return;
    setError('');
    try {
      const res = await api.delete<{ success: boolean; data: { images: string[] } }>(
        `/api/courts/${id}/images/${index}`
      );
      setCourt((c) => (c ? { ...c, images: res.data.data.images } : c));
    } catch {
      setError('Error al eliminar la imagen');
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
        <Link to="/canchas" style={{ fontSize: 13, color: 'var(--fg-faint)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Canchas
        </Link>
        <span style={{ color: 'var(--border-strong)' }}>/</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>
          {isEdit ? (court?.name ?? 'Editar cancha') : 'Nueva cancha'}
        </span>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ── Info básica ── */}
        <Section title="Información básica">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Nombre *">
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Cancha 1 — Grass Sintético" className="input" />
            </Field>
            <Field label="Precio por hora (S/) *">
              <input required type="number" min="0" step="0.50" value={form.pricePerHour} onChange={(e) => setForm((f) => ({ ...f, pricePerHour: e.target.value }))} placeholder="50" className="input" style={{ maxWidth: 180 }} />
            </Field>
            <Field label="Descripción">
              <RichTextEditor value={form.description} onChange={(html) => setForm((f) => ({ ...f, description: html }))} />
            </Field>
          </div>
        </Section>

        {/* ── Ubicación ── */}
        <Section title="Ubicación" subtitle={mapsReady ? 'Escribe y selecciona de las sugerencias para guardar coordenadas exactas.' : 'Ingresa la dirección completa de la cancha.'}>
          <Field label="Dirección *">
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-faint)', fontSize: 14 }}>📍</span>
              <input ref={locationRef} required value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value, coordinates: undefined }))} placeholder="Av. Los Deportes 123, Lima" className="input" style={{ paddingLeft: 32 }} />
            </div>
            {form.coordinates && (
              <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                ✓ Coordenadas guardadas ({form.coordinates.lat.toFixed(5)}, {form.coordinates.lng.toFixed(5)})
              </p>
            )}
          </Field>
        </Section>

        {/* ── Horarios ── */}
        <Section title="Horarios disponibles" subtitle="Define los turnos en que la cancha puede ser reservada.">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-faint)', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 }}>Configuración rápida</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SCHEDULE_PRESETS.map((preset) => (
                <button key={preset.label} type="button" onClick={() => applyPreset(preset)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 12, padding: '5px 12px', borderRadius: 999,
                  border: '1px solid var(--border)', color: 'var(--fg-muted)',
                  background: 'transparent', cursor: 'pointer', transition: 'all 100ms',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-muted)'; }}
                >
                  <span>{preset.icon}</span> {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {form.availableSlots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', background: 'var(--bg-elev-2)', borderRadius: 10 }}>
                <div style={{ fontSize: 13, color: 'var(--fg-faint)' }}>Sin turnos configurados.</div>
                <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 4, opacity: 0.7 }}>Usa una configuración rápida o agrega un turno.</div>
              </div>
            ) : (
              form.availableSlots.map((slot, i) => {
                const dur = slotDuration(slot);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-elev-2)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border)' }}>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-faint)', width: 18, textAlign: 'center' }}>{i + 1}</span>
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginBottom: 4 }}>Inicio</div>
                        <input type="time" value={slot.startTime} onChange={(e) => updateSlot(i, 'startTime', e.target.value)} className="input" style={{ fontSize: 13 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginBottom: 4 }}>Fin</div>
                        <input type="time" value={slot.endTime} onChange={(e) => updateSlot(i, 'endTime', e.target.value)} className="input" style={{ fontSize: 13 }} />
                      </div>
                    </div>
                    {dur && (
                      <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '3px 8px', borderRadius: 6, flexShrink: 0 }}>
                        {dur}
                      </span>
                    )}
                    <button type="button" onClick={() => removeSlot(i)} style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: '1px solid var(--border)', color: 'var(--danger)', cursor: 'pointer', fontSize: 16, display: 'grid', placeItems: 'center', flexShrink: 0 }} title="Eliminar">×</button>
                  </div>
                );
              })
            )}
          </div>

          <button type="button" onClick={addSlot} style={{ width: '100%', padding: '12px', borderRadius: 10, border: '2px dashed var(--border)', fontSize: 13, color: 'var(--fg-faint)', background: 'transparent', cursor: 'pointer', transition: 'all 100ms', fontWeight: 500 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--fg-faint)'; }}
          >
            + Agregar turno personalizado
          </button>
        </Section>

        {/* ── Fotos ── */}
        {isEdit ? (
          <Section title="Fotos de la cancha" subtitle="La primera foto se usa como portada. Máximo 5 imágenes.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {(court?.images ?? []).map((img, i) => (
                <div key={img} style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden' }}
                  onMouseEnter={e => { const overlay = (e.currentTarget as HTMLDivElement).querySelector('.img-overlay') as HTMLDivElement; if (overlay) overlay.style.opacity = '1'; }}
                  onMouseLeave={e => { const overlay = (e.currentTarget as HTMLDivElement).querySelector('.img-overlay') as HTMLDivElement; if (overlay) overlay.style.opacity = '0'; }}
                >
                  <img src={img} alt={`Foto ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div className="img-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 150ms' }}>
                    <button type="button" onClick={() => handleImageDelete(i)} style={{ background: 'var(--danger)', color: '#fff', fontSize: 12, padding: '5px 12px', borderRadius: 6, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                      Eliminar
                    </button>
                  </div>
                  {i === 0 && (
                    <span style={{ position: 'absolute', top: 6, left: 6, fontSize: 10, background: 'var(--accent)', color: 'var(--accent-fg)', padding: '2px 7px', borderRadius: 999, fontWeight: 600 }}>
                      Portada
                    </span>
                  )}
                </div>
              ))}
              {(court?.images?.length ?? 0) < 5 && (
                <label style={{ aspectRatio: '16/9', borderRadius: 8, border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--fg-faint)', cursor: 'pointer', transition: 'all 100ms' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLLabelElement).style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLLabelElement).style.color = 'var(--fg-faint)'; }}
                >
                  {uploadingImage ? (
                    <>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
                      {uploadProgress && <span style={{ fontSize: 11, color: 'var(--accent)' }}>Subiendo {uploadProgress.current} / {uploadProgress.total}</span>}
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 22, fontWeight: 300 }}>+</span>
                      <span style={{ fontSize: 11, fontWeight: 500 }}>Agregar fotos</span>
                      <span style={{ fontSize: 10, opacity: 0.6 }}>{5 - (court?.images?.length ?? 0)} restante{5 - (court?.images?.length ?? 0) === 1 ? '' : 's'}</span>
                    </>
                  )}
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: 'none' }} onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
              )}
            </div>
          </Section>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'var(--info-soft)', border: '1px solid color-mix(in oklch, var(--info), transparent 60%)', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: 'var(--info)' }}>
            <span>💡</span>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Fotos disponibles luego de crear</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Podrás agregar hasta 5 fotos desde la pantalla de edición.</div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: 'var(--danger-soft)', border: '1px solid color-mix(in oklch, var(--danger), transparent 60%)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--danger)' }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 24 }}>
          <button type="button" onClick={() => navigate('/canchas')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary" style={{ gap: 8 }}>
            {saving ? (
              <>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'rgba(255,255,255,0.9)', animation: 'spin 0.7s linear infinite' }} />
                Guardando...
              </>
            ) : isEdit ? 'Guardar cambios' : 'Crear cancha →'}
          </button>
        </div>
      </form>
    </div>
  );
}
