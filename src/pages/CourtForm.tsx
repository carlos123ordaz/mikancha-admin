import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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

const EMPTY_FORM: CourtFormData = {
  name: '',
  location: '',
  pricePerHour: '',
  description: '',
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

/* ─── Componente de sección ─── */
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="mb-5">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
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
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          to="/canchas"
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1"
        >
          ← Canchas
        </Link>
        <span className="text-gray-200">/</span>
        <h1 className="text-xl font-bold text-gray-900">
          {isEdit ? (court?.name ?? 'Editar cancha') : 'Nueva cancha'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Información básica ── */}
        <Section title="Información básica">
          <div className="space-y-4">
            <Field label="Nombre *">
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Cancha 1 — Grass Sintético"
                className="input w-full"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Precio por hora (S/) *">
                <input
                  required
                  type="number"
                  min="0"
                  step="0.50"
                  value={form.pricePerHour}
                  onChange={(e) => setForm((f) => ({ ...f, pricePerHour: e.target.value }))}
                  placeholder="50"
                  className="input w-full"
                />
              </Field>
            </div>
            <Field label="Descripción">
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe la cancha: tipo de piso, dimensiones, techado, etc."
                rows={3}
                className="input w-full resize-none"
              />
            </Field>
          </div>
        </Section>

        {/* ── Ubicación ── */}
        <Section
          title="Ubicación"
          subtitle={
            mapsReady
              ? 'Escribe y selecciona de las sugerencias para guardar coordenadas exactas.'
              : 'Ingresa la dirección completa de la cancha.'
          }
        >
          <Field label="Dirección *">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                📍
              </span>
              <input
                ref={locationRef}
                required
                value={form.location}
                onChange={(e) => {
                  setForm((f) => ({ ...f, location: e.target.value, coordinates: undefined }));
                }}
                placeholder="Av. Los Deportes 123, Lima"
                className="input w-full pl-9"
              />
            </div>
            {form.coordinates && (
              <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                ✓ Coordenadas exactas guardadas ({form.coordinates.lat.toFixed(5)},{' '}
                {form.coordinates.lng.toFixed(5)})
              </p>
            )}
          </Field>
        </Section>

        {/* ── Horarios ── */}
        <Section
          title="Horarios disponibles"
          subtitle="Define los turnos en que la cancha puede ser reservada. Cada turno es un bloque continuo."
        >
          {/* Presets rápidos */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Configuración rápida
            </p>
            <div className="flex flex-wrap gap-2">
              {SCHEDULE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition-all"
                >
                  <span>{preset.icon}</span>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slots actuales */}
          <div className="space-y-2 mb-4">
            {form.availableSlots.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-400">Sin turnos configurados.</p>
                <p className="text-xs text-gray-300 mt-0.5">Usa una configuración rápida o agrega un turno.</p>
              </div>
            ) : (
              form.availableSlots.map((slot, i) => {
                const dur = slotDuration(slot);
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100"
                  >
                    <span className="text-xs font-bold text-gray-400 w-5 text-center">{i + 1}</span>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Inicio</p>
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => updateSlot(i, 'startTime', e.target.value)}
                          className="input w-full text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Fin</p>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => updateSlot(i, 'endTime', e.target.value)}
                          className="input w-full text-sm"
                        />
                      </div>
                    </div>
                    {dur && (
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-lg w-12 text-center flex-shrink-0">
                        {dur}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeSlot(i)}
                      className="text-red-300 hover:text-red-600 hover:bg-red-50 w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 text-lg"
                      title="Eliminar turno"
                    >
                      ×
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={addSlot}
            className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all font-medium"
          >
            + Agregar turno personalizado
          </button>
        </Section>

        {/* ── Fotos ── */}
        {isEdit ? (
          <Section
            title="Fotos de la cancha"
            subtitle="La primera foto se usa como portada. Máximo 5 imágenes."
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(court?.images ?? []).map((img, i) => (
                <div key={img} className="relative aspect-video rounded-xl overflow-hidden group">
                  <img src={img} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleImageDelete(i)}
                      className="bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg font-semibold shadow"
                    >
                      Eliminar
                    </button>
                  </div>
                  {i === 0 && (
                    <span className="absolute top-2 left-2 text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-semibold">
                      Portada
                    </span>
                  )}
                </div>
              ))}

              {(court?.images?.length ?? 0) < 5 && (
                <label className="aspect-video rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-green-400 hover:text-green-500 hover:bg-green-50 transition-all cursor-pointer">
                  {uploadingImage ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500" />
                      {uploadProgress && (
                        <span className="text-[11px] font-medium text-green-600">
                          Subiendo {uploadProgress.current} / {uploadProgress.total}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-light">+</span>
                      <span className="text-xs font-medium">Agregar fotos</span>
                      <span className="text-[10px] text-gray-300">
                        Puedes seleccionar varias ({5 - (court?.images?.length ?? 0)} restante{5 - (court?.images?.length ?? 0) === 1 ? '' : 's'})
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </label>
              )}
            </div>
          </Section>
        ) : (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
            <span className="text-blue-400 mt-0.5">💡</span>
            <div>
              <p className="font-medium">Fotos disponibles luego de crear</p>
              <p className="text-blue-500 text-xs mt-0.5">
                Podrás agregar hasta 5 fotos desde la pantalla de edición.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <button
            type="button"
            onClick={() => navigate('/canchas')}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Guardando...
              </>
            ) : isEdit ? (
              'Guardar cambios'
            ) : (
              'Crear cancha →'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
