import SiteFooter from './SiteFooter';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-4xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)]">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
          Agente Advance
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[#4B2C82]">
          Términos y Condiciones
        </h1>

        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-700">
          <section>
            <h2 className="text-lg font-black text-slate-900">1. Servicio</h2>
            <p className="mt-2">
              Agente Advance ofrece una suscripción mensual o anual de software con funciones
              de IA orientadas a inmobiliarias, automatización comercial y herramientas de
              gestión para agentes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">2. Pagos</h2>
            <p className="mt-2">
              Los pagos y renovaciones de la suscripción son procesados por Paddle.com como
              proveedor de facturación y cobro.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">3. Cancelaciones</h2>
            <p className="mt-2">
              El usuario puede cancelar su suscripción en cualquier momento. La cancelación
              evita renovaciones futuras, manteniéndose el acceso hasta el final del período
              abonado.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">4. Propiedad Intelectual</h2>
            <p className="mt-2">
              El contenido, datos y materiales generados o cargados por el usuario dentro de la
              plataforma pertenecen al usuario. El software, la marca, el diseño y la
              infraestructura de Agente Advance pertenecen a Agente Advance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">5. Uso Aceptable</h2>
            <p className="mt-2">
              El usuario se compromete a utilizar la plataforma conforme a la ley y a no cargar
              contenido ilícito, engañoso, ofensivo o que infrinja derechos de terceros.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">6. Contacto</h2>
            <p className="mt-2">
              Para consultas sobre estos términos o sobre la suscripción, el usuario puede
              contactarse con Agente Advance por los canales informados en la plataforma.
            </p>
          </section>
        </div>

        <SiteFooter />
      </div>
    </div>
  );
}
