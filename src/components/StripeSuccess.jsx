import { useEffect, useState } from 'react';
import { PROFILES_TABLE, supabase } from '../services/supabaseClient';

export default function StripeSuccess({ session }) {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Estamos validando tu pago de prueba...');

  useEffect(() => {
    let active = true;

    const activarPlan = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id');

        if (!sessionId) {
          throw new Error('No recibimos el identificador de la sesión de pago.');
        }

        const response = await fetch(
          `/api/verify-checkout-session?session_id=${encodeURIComponent(sessionId)}`,
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'No pudimos verificar el pago.');
        }

        if (!payload.isPaid) {
          throw new Error('Stripe todavía no confirmó el pago como exitoso.');
        }

        if (payload.userId && payload.userId !== session?.user?.id) {
          throw new Error('La compra no corresponde al usuario autenticado.');
        }

        const { error } = await supabase.from(PROFILES_TABLE).upsert({
          id: session.user.id,
          plan: 'pro',
        });

        if (error) {
          throw error;
        }

        if (!active) return;

        setStatus('success');
        setMessage('Tu pago fue validado correctamente. Tu cuenta ya está en plan PRO.');
      } catch (error) {
        console.error('Error al activar el plan PRO:', error);

        if (!active) return;

        setStatus('error');
        setMessage(error.message || 'No se pudo activar el plan PRO.');
      }
    };

    activarPlan();

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)]">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
          Stripe Checkout
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[#4B2C82]">
          {status === 'success' ? '¡Pago exitoso!' : status === 'error' ? 'No pudimos activarlo' : 'Procesando tu compra'}
        </h1>
        <p className="mt-4 text-sm font-medium text-slate-600">{message}</p>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => {
              window.location.href = '/';
            }}
            className="rounded-2xl bg-[#4B2C82] px-6 py-3 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-[#4B2C82]/20 transition hover:bg-[#3d236a]"
          >
            Volver al panel
          </button>
        </div>
      </div>
    </div>
  );
}
