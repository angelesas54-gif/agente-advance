/**
 * Borrador del formulario cliente (alta, agenda, ACM, ficha).
 * Se guarda en localStorage con clave por usuario + id de cliente; sobrevive a recargas y cierres de pestaña
 * mientras el navegador conserve el almacenamiento del sitio.
 */
export const CLIENTE_FORM_DRAFT_VERSION = 2;

export function getClienteFormDraftStorageKey(userId, edicionId) {
  const uid = String(userId || 'anon');
  const seg = edicionId == null || edicionId === '' ? 'nuevo' : String(edicionId);
  return `aa_v2_cliente_draft_${uid}_${seg}`;
}

export function removeClienteFormDraftStorage(userId, edicionId) {
  try {
    globalThis?.localStorage?.removeItem(getClienteFormDraftStorageKey(userId, edicionId));
  } catch {
    /* ignore */
  }
}

/** Borra todos los borradores de formulario cliente de un usuario (p. ej. al cerrar sesión). */
export function clearAllClienteFormDraftsForUser(userId) {
  if (!userId || typeof globalThis?.localStorage === 'undefined') return;
  const prefix = `aa_v2_cliente_draft_${String(userId)}_`;
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) toRemove.push(k);
  }
  toRemove.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  });
}
