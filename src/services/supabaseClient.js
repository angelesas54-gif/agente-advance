import { createClient } from '@supabase/supabase-js';

export const HARDCODED_SUPABASE_URL = 'https://uvkvkrcjklilfakfgedh.supabase.co';
export const HARDCODED_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2a3ZrcmNqa2xpbGZha2ZnZWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NjkzNDQsImV4cCI6MjA4ODA0NTM0NH0.LN8qGIGPSZJRXR-ejbUT8cSPlCwZNk79HgTFkyuFMww';
export const PROFILES_TABLE = 'perfiles';
/** Timeline del cliente (fichas, altas, etc.). Desactivá con `VITE_HISTORIAL_INTERACCIONES_TABLE=` vacío en .env si no usás la tabla. */
export const HISTORIAL_INTERACCIONES_TABLE =
  import.meta.env.VITE_HISTORIAL_INTERACCIONES_TABLE !== undefined
    ? import.meta.env.VITE_HISTORIAL_INTERACCIONES_TABLE
    : 'historial_interacciones';
export const ADMIN_USER_ID = import.meta.env.VITE_ADMIN_USER_ID || '';
export const FORCED_BYPASS_USER_ID = '5a447fcf-c8ce-4273-ab37-bf7693234f2f';
const SUPABASE_PROJECT_REF = 'uvkvkrcjklilfakfgedh';
const SUPABASE_AUTH_STORAGE_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getStoredSupabaseUserId() {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    const rawValue = window.localStorage?.getItem(SUPABASE_AUTH_STORAGE_KEY);

    if (!rawValue) {
      return '';
    }

    const parsedValue = JSON.parse(rawValue);
    const candidateUserId = parsedValue?.user?.id || parsedValue?.currentSession?.user?.id || '';
    return UUID_REGEX.test(candidateUserId) ? candidateUserId : '';
  } catch {
    return '';
  }
}

export const supabase = createClient(HARDCODED_SUPABASE_URL, HARDCODED_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
