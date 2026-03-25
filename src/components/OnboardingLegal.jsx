import { useState } from 'react';
import { PROFILES_TABLE, supabase } from '../services/supabaseClient';

const LEGAL_VERSION = '1.0';

export default function OnboardingLegal({ session, onAccepted }) {
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch {
      /* seguir con limpieza local */
    }
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    window.location.replace('/login');
  };

  const handleAccept = async (event) => {
    event.preventDefault();

    if (!session?.user?.id || !aceptaTerminos) {
      return;
    }

    setLoading(true);
    setError('');

    const { error: upsertError } = await supabase.from(PROFILES_TABLE).upsert({
      id: session.user.id,
      plan: 'free',
      acepta_terminos: true,
      fecha_aceptacion: new Date().toISOString(),
      version_legal: LEGAL_VERSION,
    });

    if (upsertError) {
      setError(upsertError.message || 'No se pudo registrar tu aceptación.');
      setLoading(false);
      return;
    }

    setLoading(false);

    if (typeof onAccepted === 'function') {
      await onAccepted();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#4B2C82] via-[#5d36a0] to-[#6f46c7] px-6 py-8 text-white sm:px-8">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-white/70">
            Onboarding Legal
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Antes de empezar</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/80">
            Necesitamos tu aceptación legal para habilitar el acceso a Agente Advance.
          </p>
        </div>

        <form onSubmit={handleAccept} className="space-y-6 p-6 sm:p-8">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              Contrato de Licencia y Términos
            </p>

            <div className="mt-4 h-[420px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-700 shadow-inner">
              <p className="mb-2 border-b border-slate-200 pb-1 text-xs font-black uppercase text-[#4B2C82]">
                1. NATURALEZA Y OBJETO DEL CONTRATO
              </p>
              <p className="mb-4 text-justify">
                El presente contrato regula el uso de la plataforma "Agente Advance" (en adelante, "la Aplicación"). El usuario (en adelante, "el Agente") reconoce que la Aplicación es una herramienta de software de apoyo a la gestión inmobiliaria y no constituye asesoramiento legal, contable ni financiero. El Agente utiliza la herramienta bajo su propia cuenta y riesgo.
              </p>

              <p className="mb-2 border-b border-slate-200 pb-1 text-xs font-black uppercase text-[#4B2C82]">
                2. RESPONSABILIDAD SOBRE DATOS DE TERCEROS
              </p>
              <p className="mb-4 text-justify">
                El Agente declara ser el responsable único del tratamiento de los datos personales de sus clientes que ingrese en el sistema, conforme a las leyes de protección de datos vigentes. Agente Advance actúa exclusivamente como un custodio técnico. El Agente garantiza que posee el consentimiento expreso de sus clientes para procesar su información. Agente Advance queda exonerado de cualquier reclamo por uso indebido, filtración o pérdida de datos de terceros ingresados por el Agente.
              </p>

              <p className="mb-2 border-b border-slate-200 pb-1 text-xs font-black uppercase text-[#4B2C82]">
                3. PLAN PRO: PAGOS, TARIFAS Y REEMBOLSOS
              </p>
              <p className="mb-4 text-justify">
                El acceso a las funciones avanzadas ("Plan PRO") está sujeto al pago de una suscripción.
                <br />
                <strong>A) Irrevocabilidad del Pago:</strong> Debido al acceso inmediato a la propiedad intelectual y herramientas digitales, el Agente acepta que NO se realizarán reembolsos, devoluciones ni cancelaciones de cargos ya efectuados bajo ninguna circunstancia.
                <br />
                <strong>B) Fallos en la Suscripción:</strong> En caso de rechazo del pago, el acceso PRO se suspenderá automáticamente, sin que esto genere responsabilidad por pérdida de información o interrupción de flujos de trabajo.
              </p>

              <p className="mb-2 border-b border-slate-200 pb-1 text-xs font-black uppercase text-[#4B2C82]">
                4. LIMITACIÓN ABSOLUTA DE RESPONSABILIDAD Y LUCRO CESANTE
              </p>
              <p className="mb-4 text-justify italic font-bold text-red-700 uppercase">
                IMPORTANTE: Bajo ninguna circunstancia Agente Advance, sus desarrolladores o propietarios serán responsables por daños indirectos, incidentales, punitivos o lucro cesante (incluyendo, pero no limitado a: pérdida de comisiones inmobiliarias, pérdida de clientes, errores en tasaciones o fallos en el cierre de ventas) derivados del uso o la imposibilidad de uso de la plataforma.
              </p>
              <p className="mb-4 text-justify">
                La responsabilidad total acumulada ante cualquier tribunal se limitará exclusivamente al importe total abonado por el Agente en concepto de suscripción durante los tres (3) meses inmediatamente anteriores al hecho que motivó la reclamación.
              </p>

              <p className="mb-2 border-b border-slate-200 pb-1 text-xs font-black uppercase text-[#4B2C82]">
                5. DISPONIBILIDAD DEL SERVICIO (UPTIME)
              </p>
              <p className="mb-4 text-justify">
                Agente Advance depende de servidores de terceros (Cloud Computing). No se garantiza la disponibilidad del 100%. El Agente renuncia a cualquier acción legal por caídas del sistema, mantenimiento programado, errores de código (bugs) o pérdida temporal de acceso a la información.
              </p>

              <p className="mb-2 border-b border-slate-200 pb-1 text-xs font-black uppercase text-[#4B2C82]">
                6. PROPIEDAD INTELECTUAL Y MARCAS
              </p>
              <p className="mb-4 text-justify">
                El Agente declara que posee los derechos sobre cualquier logotipo o nombre comercial que cargue en la plataforma. Agente Advance se reserva el derecho de eliminar contenido que infrinja derechos de autor de terceros. La marca "Agente Advance" y su código fuente son propiedad exclusiva y protegida internacionalmente.
              </p>

              <p className="mb-2 border-b border-slate-200 pb-1 text-xs font-black uppercase text-[#4B2C82]">
                7. INEXISTENCIA DE RELACIÓN LABORAL O SOCIEDAD
              </p>
              <p className="mb-4 text-justify">
                Este acuerdo no crea una relación de sociedad, agencia, franquicia ni contrato de trabajo entre las partes. El Agente es un profesional independiente que utiliza una herramienta de software.
              </p>

              <p className="mb-2 border-b border-slate-200 pb-1 text-xs font-black uppercase text-[#4B2C82]">
                8. AUDITORÍA Y SUSPENSIÓN DE CUENTA
              </p>
              <p className="mb-4 text-justify">
                Agente Advance podrá suspender sin previo aviso a cualquier usuario que intente vulnerar la seguridad, realice ingeniería inversa o utilice la plataforma para fines ilícitos o difamatorios.
              </p>

              <p className="mb-2 border-b border-slate-200 pb-1 text-xs font-black uppercase text-[#4B2C82]">
                9. JURISDICCIÓN Y LEY APLICABLE
              </p>
              <p className="mb-4 text-justify">
                Para cualquier controversia, las partes se someten a la ley vigente y a la jurisdicción de los tribunales de [TU CIUDAD/PAÍS], renunciando expresamente a cualquier otro fuero o jurisdicción.
              </p>

              <p className="mb-2 border-b border-slate-200 pb-1 text-xs font-black uppercase text-[#4B2C82]">
                10. CONSENTIMIENTO Y FIRMA DIGITAL
              </p>
              <p className="mb-4 text-justify font-bold">
                Al marcar la casilla "Acepto los términos" y presionar el botón de guardado, el Agente emite una firma electrónica vinculante. El sistema registrará la dirección IP, la fecha, la hora exacta y la versión de este contrato para fines de prueba legal ante terceros.
              </p>

              <p className="mt-6 border-t-2 border-[#4B2C82] pt-4 text-center text-xs font-black uppercase italic tracking-tight text-[#4B2C82]">
                DOCUMENTO LEGAL VINCULANTE - VERSIÓN 1.0 (2026)
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={aceptaTerminos}
                onChange={(event) => setAceptaTerminos(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#4B2C82] focus:ring-[#4B2C82]"
              />
              <span className="text-sm font-medium text-slate-700">
                He leído y acepto el contrato de licencia de uso y los términos legales de
                Agente Advance.
              </span>
            </label>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col items-end gap-3">
            <button
              type="submit"
              disabled={!aceptaTerminos || loading}
              className="inline-flex items-center justify-center rounded-2xl bg-[#4B2C82] px-6 py-3 text-sm font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-[#4B2C82]/20 transition hover:bg-[#3d236a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Guardando...' : 'Comenzar a trabajar'}
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 transition hover:text-red-500"
            >
              Cerrar Sesión
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
