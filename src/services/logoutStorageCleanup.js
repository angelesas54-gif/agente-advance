import { clearAllClienteFormDraftsForUser } from './clienteFormDraftStorage';

/** Mismas claves que en Dashboard: borradores legacy del flujo cliente. */
const CUSTOMER_DRAFT_KEYS = [
  'temp_titulo',
  'temp_precio',
  'temp_desc',
  'temp_precios',
  'temp_links',
  'temp_compradorImagen',
  'temp_fechaVisita',
  'temp_fichaColega',
  'borrador_agente_advance',
];

export const LAST_PLAN_STORAGE_KEY = 'agente_advance_last_plan';

export function clearCustomerDraftKeys() {
  if (typeof globalThis?.localStorage === 'undefined') return;
  CUSTOMER_DRAFT_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  });
}

/**
 * Limpieza local antes de cerrar sesión.
 * @param {{ skipSessionStorageClear?: boolean }} [options] Si es true, no vacía sessionStorage (p. ej. para dejar bandera y redirigir primero a /login).
 */
export function runLogoutLocalCleanup(userId, options = {}) {
  const { skipSessionStorageClear = false } = options;
  if (userId) {
    clearAllClienteFormDraftsForUser(userId);
  }
  clearCustomerDraftKeys();
  if (!skipSessionStorageClear) {
    try {
      globalThis?.sessionStorage?.clear();
    } catch {
      /* ignore */
    }
  }
}
