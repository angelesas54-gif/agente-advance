import { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import EmailConfirmationNotice from './EmailConfirmationNotice';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: 'https://agenteadvance.com',
          },
        });

        if (error) {
          setAuthError(error.message || 'No se pudo registrar.');
        } else {
          const requiereConfirmacion =
            !!data?.user && !data?.session && !data?.user?.email_confirmed_at;

          if (requiereConfirmacion) {
            setPendingConfirmationEmail(normalizedEmail);
            setIsRegistering(false);
          } else if (data?.session) {
            /* La sesión la aplica App.jsx vía onAuthStateChange; no recargar para evitar pérdida de estado. */
          } else {
            setAuthError('Revisá tu email para confirmar la cuenta si hace falta.');
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          setAuthError(error.message || 'Credenciales incorrectas.');
        } else if (!data?.session) {
          setAuthError('No se pudo obtener la sesión. Reintentá o revisá la confirmación de email.');
        }
        /* Con sesión OK, App re-renderiza solo; si la URL es /login, App.jsx corrige a / sin reload. */
      }
    } catch (err) {
      setAuthError(err?.message || 'Error inesperado. Reintentá.');
    } finally {
      setLoading(false);
    }
  };

  if (pendingConfirmationEmail) {
    return (
      <EmailConfirmationNotice
        email={pendingConfirmationEmail}
        onBackToLogin={() => {
          setPendingConfirmationEmail('');
          setPassword('');
          setIsRegistering(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-start justify-center pt-0 pb-0 font-sans">
      <div className="bg-white px-4 pt-0 pb-1 rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-md mt-0 -mt-10">
        <div className="flex flex-col items-center justify-center pt-6 pb-2">
          <img
            src="/logo.png"
            alt="Logo Agente Advance"
            style={{ height: '120px', width: 'auto', display: 'block', objectFit: 'contain' }}
            className="mb-2"
          />
          <h2 className="text-3xl font-black text-[#4B2C82] text-center uppercase tracking-tighter mb-0 mt-0">
            {isRegistering ? 'Crea tu cuenta' : '¡Bienvenido!'}
          </h2>
          <p className="text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
            {isRegistering
              ? 'La agenda inteligente para agentes inteligentes '
              : 'Ingresa a tu panel de control'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {authError ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-xs font-bold text-red-700"
            >
              {authError}
            </div>
          ) : null}

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
              Email Profesional
            </label>
            <input
              type="email"
              placeholder="nombre@ejemplo.com"
              autoComplete="username"
              className="w-full p-4 mt-1 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={verPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full p-4 mt-1 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setVerPassword(!verPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/3 text-xl opacity-40 hover:opacity-100 transition-opacity mt-1"
              >
                {verPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {isRegistering && (
            <div className="mt-2 px-1 mb-4">
              <p className="text-[11px] text-slate-500 leading-tight italic">
                Usá al menos <span className="font-bold text-blue-600 italic">8 caracteres</span>,
                incluyendo{' '}
                <span className="font-bold text-blue-600 italic">
                  Mayúsculas, Números y Símbolos
                </span>{' '}
                (@, #, !).
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4B2C82] text-white font-black py-4 rounded-2xl uppercase shadow-[0_4px_0_0_#3a2266] active:translate-y-1 active:shadow-none transition-all mt-4 text-sm tracking-widest disabled:opacity-50"
          >
            {loading ? 'Procesando...' : isRegistering ? 'Comenzar ahora' : 'Ingresar'}
          </button>
        </form>

        <p className="mt-6 text-center text-[10px] font-semibold text-slate-500 leading-relaxed">
          ¿Problemas para entrar? Escribinos a{' '}
          <a
            href="mailto:info@agenteadvance.com?subject=Soporte%20login%20Agente%20Advance"
            className="font-black text-[#4B2C82] underline decoration-violet-300 underline-offset-2"
          >
            info@agenteadvance.com
          </a>
        </p>

        <button
          type="button"
          onClick={() => {
            setIsRegistering(!isRegistering);
            setAuthError('');
          }}
          className="w-full mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
        >
          {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿Eres nuevo? Regístrate aquí'}
        </button>
      </div>
    </div>
  );
}
