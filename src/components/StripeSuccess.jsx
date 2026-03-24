import { useEffect, useState } from 'react';
import { PROFILES_TABLE, supabase } from '../services/supabaseClient';

export default function StripeSuccess({ session }) {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Estamos confirmando tu suscripción PRO...');

  useEffect(() => {
    let active = true;

    const confirmarPlan = async () => {
      try {
        if (!session?.user?.id) {
          throw new Error('Iniciá sesión nuevamente para terminar de confirmar tu suscripción.');
        }

        let attempts = 0;
        const maxAttempts = 8;

        while (attempts < maxAttempts) {
          const { data, error } = await supabase
            .from(PROFILES_TABLE)
            .select('plan')
            .eq('id', session?.user?.id)
            .maybeSingle();

          if (error) {
            throw error;
          }

          if (String(data?.plan || '').toLowerCase() === 'pro') {
            if (!active) return;

            setStatus('success');
            setMessage('Tu pago fue validado correctamente. Tu cuenta ya está en plan PRO.');
            return;
          }

          attempts += 1;
          await new Promise((resolve) => window.setTimeout(resolve, 2000));
        }

        if (!active) return;

        setStatus('error');
        setMessage(
          'Recibimos tu pago, pero la activación todavía no se reflejó. Reingresa al panel en unos segundos.',
        );
      } catch (error) {

        if (!active) return;

        setStatus('error');
        setMessage(error.message || 'No se pudo activar el plan PRO.');
      }
    };

    confirmarPlan();

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)]">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
          Activación de Suscripción
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
