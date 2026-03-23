import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PROFILES_TABLE,
  supabase,
} from '../services/supabaseClient';

const EMPTY_FEEDBACK = { type: '', text: '' };

function normalizarPerfil(perfil) {
  if (!perfil) {
    return {
      nombre_agente: '',
      inmobiliaria: '',
      telefono: '',
      avatar_url: '',
      logo_url: '',
      website_url: '',
    };
  }

  return {
    nombre_agente: perfil.nombre_agente || '',
    inmobiliaria: perfil.inmobiliaria || '',
    telefono: perfil.telefono || '',
    avatar_url: perfil.avatar_url || '',
    logo_url: perfil.logo_url || '',
    website_url: perfil.website_url || '',
  };
}

function normalizarWebsite(url) {
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function buildProfilePayload(userId, formData, overrides = {}) {
  const nextData = { ...formData, ...overrides };

  return {
    id: userId,
    nombre_agente: nextData.nombre_agente.trim(),
    inmobiliaria: nextData.inmobiliaria.trim(),
    telefono: nextData.telefono.trim(),
    avatar_url: nextData.avatar_url?.trim() || null,
    logo_url: nextData.logo_url?.trim() || null,
    website_url: nextData.website_url?.trim() || null,
  };
}

async function uploadProfileImage({ file, userId, kind }) {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
  const safeKind = kind.replace('_url', '');
  const filePath = `${userId}/${safeKind}-${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage.from('avatars').upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

  return {
    bucketName: 'avatars',
    publicUrl: data.publicUrl,
  };
}

function AlertBox({ type, text }) {
  if (!text) return null;

  const styles =
    type === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${styles}`}>{text}</div>;
}

function PerfilForm({
  session,
  perfilExistente,
  onProfileComplete,
  setVistaActiva,
}) {
  const user = session?.user;
  const [formData, setFormData] = useState(() => normalizarPerfil(perfilExistente));
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [feedback, setFeedback] = useState(EMPTY_FEEDBACK);
  const [passwordFeedback, setPasswordFeedback] = useState(EMPTY_FEEDBACK);
  const [passwords, setPasswords] = useState({ nueva: '', confirmar: '' });
  const [avatarError, setAvatarError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [uploading, setUploading] = useState({ avatar_url: false, logo_url: false });
  const avatarInputRef = useRef(null);
  const logoInputRef = useRef(null);

  const email = user?.email || perfilExistente?.email || '';
  const brandName = useMemo(
    () => formData.inmobiliaria.trim() || formData.nombre_agente.trim() || 'Agente',
    [formData.inmobiliaria, formData.nombre_agente],
  );

  useEffect(() => {
    setFormData(normalizarPerfil(perfilExistente));
  }, [perfilExistente]);

  useEffect(() => {
    if (!user?.id) return undefined;

    let active = true;

    const cargarPerfil = async () => {
      setLoadingProfile(true);
      setFeedback(EMPTY_FEEDBACK);

      const { data, error } = await supabase
        .from(PROFILES_TABLE)
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error('Error al cargar el perfil:', error);
        setFeedback({
          type: 'error',
          text: 'No pudimos cargar tu perfil. Puedes completar el formulario y guardar nuevamente.',
        });
      } else if (data) {
        setFormData(normalizarPerfil(data));
      }

      setLoadingProfile(false);
    };

    cargarPerfil();

    return () => {
      active = false;
    };
  }, [user?.id]);

  if (!user) return null;

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));

    if (field === 'avatar_url') {
      setAvatarError(false);
    }

    if (field === 'logo_url') {
      setLogoError(false);
    }
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setFeedback(EMPTY_FEEDBACK);
    const payload = buildProfilePayload(user.id, formData);

    const { error } = await supabase.from(PROFILES_TABLE).upsert(payload);

    if (error) {
      console.error('Error al guardar el perfil:', error);
      setFeedback({
        type: 'error',
        text: `No se pudo guardar el perfil: ${error.message}`,
      });
      setSavingProfile(false);
      return;
    }

    setFeedback({
      type: 'success',
      text: 'Perfil actualizado correctamente. Tus reportes usarán estos datos.',
    });
    setSavingProfile(false);

    if (typeof onProfileComplete === 'function') {
      await onProfileComplete();
    } else if (typeof setVistaActiva === 'function') {
      setVistaActiva('principal');
    }
  };

  const handleImageUpload = async (field, file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({
        type: 'error',
        text: 'El archivo seleccionado no es una imagen válida.',
      });
      return;
    }

    setUploading((current) => ({ ...current, [field]: true }));
    setFeedback(EMPTY_FEEDBACK);

    try {
      const { bucketName, publicUrl } = await uploadProfileImage({
        file,
        userId: user.id,
        kind: field,
      });

      const nextFormData = { ...formData, [field]: publicUrl };
      const payload = buildProfilePayload(user.id, nextFormData);
      const { error } = await supabase.from(PROFILES_TABLE).upsert(payload);

      if (error) {
        throw error;
      }

      setFormData(nextFormData);
      setAvatarError(false);
      setLogoError(false);
      setFeedback({
        type: 'success',
        text: `Imagen subida correctamente al bucket ${bucketName}.`,
      });
    } catch (error) {
      console.error('Error real de Supabase al subir imagen:', error);
      setFeedback({
        type: 'error',
        text: error.message || 'No se pudo subir la imagen.',
      });
    } finally {
      setUploading((current) => ({ ...current, [field]: false }));
    }
  };

  const handleRemoveImage = async (field) => {
    const nextFormData = { ...formData, [field]: '' };
    setFormData(nextFormData);

    const { error } = await supabase.from(PROFILES_TABLE).upsert(buildProfilePayload(user.id, nextFormData));

    if (error) {
      console.error('Error al quitar imagen:', error);
      setFeedback({
        type: 'error',
        text: `No se pudo quitar la imagen: ${error.message}`,
      });
      return;
    }

    setFeedback({
      type: 'success',
      text: 'Imagen eliminada del perfil.',
    });
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordFeedback(EMPTY_FEEDBACK);

    if (passwords.nueva.length < 8) {
      setPasswordFeedback({
        type: 'error',
        text: 'La nueva contraseña debe tener al menos 8 caracteres.',
      });
      return;
    }

    if (passwords.nueva !== passwords.confirmar) {
      setPasswordFeedback({
        type: 'error',
        text: 'La confirmación no coincide con la nueva contraseña.',
      });
      return;
    }

    setSavingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: passwords.nueva,
    });

    if (error) {
      console.error('Error al actualizar la contraseña:', error);
      setPasswordFeedback({
        type: 'error',
        text: `No se pudo actualizar la contraseña: ${error.message}`,
      });
      setSavingPassword(false);
      return;
    }

    setPasswords({ nueva: '', confirmar: '' });
    setPasswordFeedback({
      type: 'success',
      text: 'Contraseña actualizada correctamente.',
    });
    setSavingPassword(false);
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#4B2C82] via-[#5d36a0] to-[#6f46c7] px-6 py-8 text-white sm:px-8">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-white/70">
            Perfil de Agente Pro
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">Identidad profesional y marca</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/80">
            Configura tus datos para que el dashboard, la ficha PDF y el ACM salgan con tu
            imagen profesional.
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-6 p-6 sm:p-8">
          <AlertBox type={feedback.type} text={feedback.text} />

          {loadingProfile && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
              Cargando datos actuales del perfil...
            </div>
          )}

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr),minmax(280px,0.9fr)]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6">
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                  Datos del Agente
                </p>
                <h3 className="mt-2 text-xl font-black text-slate-900">Tu identidad pública</h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Nombre del agente
                  </span>
                  <input
                    type="text"
                    value={formData.nombre_agente}
                    onChange={(event) => updateField('nombre_agente', event.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#4B2C82] focus:ring-4 focus:ring-[#4B2C82]/10"
                    placeholder="Ej. Andrea Pérez"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Email
                  </span>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500 outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    WhatsApp / Teléfono
                  </span>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(event) => updateField('telefono', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#4B2C82] focus:ring-4 focus:ring-[#4B2C82]/10"
                    placeholder="+54 9 11 ..."
                  />
                </label>

                <div className="block md:col-span-2">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Avatar profesional
                  </span>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleImageUpload('avatar_url', event.target.files?.[0])}
                  />
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {formData.avatar_url ? 'Avatar cargado' : 'Sube tu foto de perfil'}
                        </p>
                        <p className="text-xs text-slate-500">
                          JPG, PNG o WebP. Se guarda en Supabase Storage.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          className="rounded-2xl bg-[#4B2C82] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-[#3d236a] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {uploading.avatar_url ? 'Subiendo...' : 'Subir imagen'}
                        </button>
                        {formData.avatar_url && (
                          <button
                            type="button"
                            onClick={() => handleRemoveImage('avatar_url')}
                            className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-600 transition hover:bg-slate-50"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    </div>
                    {uploading.avatar_url && (
                      <div className="mt-3">
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full w-1/2 animate-pulse rounded-full bg-[#4B2C82]" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                Vista previa
              </p>
              <div className="mt-5 flex flex-col items-center text-center">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 shadow-inner">
                  {formData.avatar_url && !avatarError ? (
                    <img
                      src={formData.avatar_url}
                      alt="Avatar del agente"
                      className="h-full w-full object-cover"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <span className="text-3xl font-black uppercase text-slate-500">
                      {(formData.nombre_agente || email || 'A').trim().charAt(0)}
                    </span>
                  )}
                </div>

                <p className="mt-4 text-lg font-black text-slate-900">
                  {formData.nombre_agente || 'Tu nombre profesional'}
                </p>
                <p className="text-sm font-medium text-slate-500">
                  {formData.inmobiliaria || 'Marca inmobiliaria'}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {email || 'Email pendiente'}
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr),minmax(280px,0.9fr)]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6">
              <div className="mb-5">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                  Identidad de Marca
                </p>
                <h3 className="mt-2 text-xl font-black text-slate-900">Cómo salís en tus reportes</h3>
              </div>

              <div className="grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Inmobiliaria / Marca comercial
                  </span>
                  <input
                    type="text"
                    value={formData.inmobiliaria}
                    onChange={(event) => updateField('inmobiliaria', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#4B2C82] focus:ring-4 focus:ring-[#4B2C82]/10"
                    placeholder="Ej. InmoClik Premium"
                  />
                </label>

                <div className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Logo de marca
                  </span>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleImageUpload('logo_url', event.target.files?.[0])}
                  />
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {formData.logo_url ? 'Logo cargado' : 'Sube el logo de tu inmobiliaria'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Lo usaremos en tus PDFs y vistas de marca.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="rounded-2xl bg-[#4B2C82] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-[#3d236a] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {uploading.logo_url ? 'Subiendo...' : 'Subir imagen'}
                        </button>
                        {formData.logo_url && (
                          <button
                            type="button"
                            onClick={() => handleRemoveImage('logo_url')}
                            className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-600 transition hover:bg-slate-50"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    </div>
                    {uploading.logo_url && (
                      <div className="mt-3">
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full w-1/2 animate-pulse rounded-full bg-[#4B2C82]" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Website URL
                  </span>
                  <input
                    type="url"
                    value={formData.website_url}
                    onChange={(event) => updateField('website_url', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#4B2C82] focus:ring-4 focus:ring-[#4B2C82]/10"
                    placeholder="https://tuinmobiliaria.com"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                Preview de marca
              </p>

              <div className="mt-5 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-5">
                <div className="flex min-h-24 items-center justify-center rounded-2xl border border-white bg-white p-4 shadow-sm">
                  {formData.logo_url && !logoError ? (
                    <img
                      src={formData.logo_url}
                      alt="Logo de la inmobiliaria"
                      className="max-h-16 w-auto object-contain"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <div className="text-center">
                      <p className="text-lg font-black text-slate-800">{brandName}</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Se usará como fallback en PDF
                      </p>
                    </div>
                  )}
                </div>

                {formData.website_url && (
                  <a
                    href={normalizarWebsite(formData.website_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 block truncate text-sm font-semibold text-[#4B2C82] underline underline-offset-4"
                  >
                    {normalizarWebsite(formData.website_url)}
                  </a>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                Seguridad
              </p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Cambio de Contraseña</h3>
              <p className="mt-2 text-sm text-slate-500">
                Actualiza tu acceso con Supabase Auth sin salir del panel.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr),minmax(260px,0.8fr)]">
              <div className="grid gap-4">
                <AlertBox type={passwordFeedback.type} text={passwordFeedback.text} />

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Nueva contraseña
                  </span>
                  <input
                    type="password"
                    value={passwords.nueva}
                    onChange={(event) =>
                      setPasswords((current) => ({ ...current, nueva: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#4B2C82] focus:ring-4 focus:ring-[#4B2C82]/10"
                    placeholder="Mínimo 8 caracteres"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Confirmar contraseña
                  </span>
                  <input
                    type="password"
                    value={passwords.confirmar}
                    onChange={(event) =>
                      setPasswords((current) => ({ ...current, confirmar: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#4B2C82] focus:ring-4 focus:ring-[#4B2C82]/10"
                    placeholder="Repite la contraseña"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingPassword ? 'Actualizando...' : 'Cambiar contraseña'}
                </button>
              </div>

              <div className="rounded-[28px] border border-white bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  Recomendación
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Usa una clave larga, con mayúsculas, números y símbolos. Si cambias la
                  contraseña, el acceso se actualiza directamente en Supabase.
                </p>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-slate-500">
              Los cambios impactan en tu perfil y en los PDFs que compartes.
            </p>

            <button
              type="submit"
              disabled={savingProfile || loadingProfile}
              className="inline-flex items-center justify-center rounded-2xl bg-[#4B2C82] px-6 py-3 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-[#4B2C82]/20 transition hover:bg-[#3d236a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingProfile ? 'Guardando...' : 'Guardar perfil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PerfilForm;
