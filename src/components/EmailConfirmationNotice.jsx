import { supabase } from '../services/supabaseClient';

export default function EmailConfirmationNotice({ email = '', onBackToLogin }) {
  const handleBackToLogin = async () => {
    await supabase.auth.signOut();

    if (typeof onBackToLogin === 'function') {
      onBackToLogin();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col items-center text-center">
          <img
            src="/logo.png"
            alt="Logo Agente Advance"
            className="mb-4 h-24 w-auto object-contain"
          />

          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
            Confirmación de email
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#4B2C82]">
            ¡Revisa tu casilla!
          </h2>
          <p className="mt-3 text-sm font-medium text-slate-600">
            Te enviamos un correo de confirmación
            {email ? ` a ${email}` : ''}. Debes verificar tu email antes de continuar a
            Agente Advance.
          </p>

          <button
            type="button"
            onClick={handleBackToLogin}
            className="mt-8 text-xs font-black uppercase tracking-[0.2em] text-slate-400 transition hover:text-red-500"
          >
            Volver al Login
          </button>
        </div>
      </div>
    </div>
  );
}
