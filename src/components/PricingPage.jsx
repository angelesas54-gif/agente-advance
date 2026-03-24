import SiteFooter from './SiteFooter';
import { useState } from 'react';
import { openPaddleCheckout, PADDLE_PRICE_IDS } from '../services/paddleClient';

export default function PricingPage({ session }) {
  const [checkoutLoading, setCheckoutLoading] = useState('');

  const handleCheckout = async (planType) => {
    try {
      setCheckoutLoading(planType);

      await openPaddleCheckout({
        priceId: PADDLE_PRICE_IDS[planType],
        email: session?.user?.email || '',
        userId: session?.user?.id || '',
      });
    } catch (error) {
      console.error('Error al abrir Paddle Checkout:', error);
      alert(error.message || 'No se pudo abrir Paddle Checkout.');
    } finally {
      setCheckoutLoading('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)]">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
          Agente Advance
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[#4B2C82]">
          Elegí tu plan PRO
        </h1>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
              Plan Mensual
            </p>
            <h2 className="mt-3 text-3xl font-black text-slate-900">$9,90 USD / mes</h2>
            <p className="mt-3 text-sm font-medium text-slate-600">
              Ideal para los que quieren probar Agente Advance.
            </p>
            <ul className="mt-6 space-y-3 text-sm font-semibold text-slate-700">
              <li>IA para leads</li>
              <li>Automatización</li>
              <li>Soporte</li>
            </ul>
            <button
              type="button"
              onClick={() => handleCheckout('monthly')}
              disabled={checkoutLoading === 'monthly'}
              className="mt-6 w-full rounded-2xl bg-[#001f3f] px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkoutLoading === 'monthly' ? 'Abriendo checkout...' : 'Elegir mensual'}
            </button>
          </div>

          <div className="rounded-[28px] border border-[#4B2C82] bg-white p-6 shadow-sm">
            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
              Ahorrá más de 2 meses
            </span>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
              Plan Anual
            </p>
            <h2 className="mt-3 text-3xl font-black text-[#4B2C82]">$79 USD / año</h2>
            <p className="mt-3 text-sm font-medium text-slate-600">
              La opción ideal para crecer con una oferta más sólida y conveniente.
            </p>
            <ul className="mt-6 space-y-3 text-sm font-semibold text-slate-700">
              <li>IA para leads</li>
              <li>Automatización</li>
              <li>Soporte</li>
            </ul>
            <button
              type="button"
              onClick={() => handleCheckout('annual')}
              disabled={checkoutLoading === 'annual'}
              className="mt-6 w-full rounded-2xl bg-[#4B2C82] px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg transition hover:bg-[#3d236a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkoutLoading === 'annual' ? 'Abriendo checkout...' : 'Elegir anual'}
            </button>
          </div>
        </div>

        <SiteFooter />
      </div>
    </div>
  );
}
