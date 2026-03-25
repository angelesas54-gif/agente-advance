/** Formato de montos en vivo (es-AR: miles con punto). */

const LOCALE = 'es-AR';

export function extraerDigitosPrecio(str) {
  return String(str ?? '').replace(/\D/g, '');
}

export function formatearMilesEsARFromDigitString(digits) {
  if (!digits) return '';
  const n = Number(digits);
  if (!Number.isFinite(n)) return '';
  return new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(n);
}

/** Entero para DB, PDF y promedios (ignora separadores y prefijo USD). */
export function precioTextoANumeroEntero(str) {
  const digits = extraerDigitosPrecio(str);
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

/** Desde número o string guardado en servidor → solo dígitos para estado. */
export function precioServidorADigitos(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.round(value));
  }
  return extraerDigitosPrecio(String(value));
}

export function precioTasacionDesdeDigitos(digits) {
  if (!digits) return '';
  const fmt = formatearMilesEsARFromDigitString(digits);
  return fmt ? `USD ${fmt}` : '';
}

export function precioTasacionDesdeValorDb(value) {
  if (value == null || value === '') return '';
  const n =
    typeof value === 'number' && Number.isFinite(value)
      ? Math.round(value)
      : precioTextoANumeroEntero(String(value));
  if (n == null) return '';
  return precioTasacionDesdeDigitos(String(n));
}

/** Superficie m²: admite coma o punto decimal. */
export function metrosCuadradosANumero(valor) {
  const t = String(valor ?? '').trim();
  if (!t) return null;
  const sinMiles = t.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(sinMiles);
  return Number.isNaN(num) ? null : num;
}
