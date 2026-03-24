import SiteFooter from './SiteFooter';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-4xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)]">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
          Agente Advance
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[#4B2C82]">
          Política de Privacidad
        </h1>

        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-700">
          <section>
            <h2 className="text-lg font-black text-slate-900">1. Información que recopilamos</h2>
            <p className="mt-2">
              Agente Advance puede recopilar datos de cuenta, información profesional del
              usuario, contenido cargado en la plataforma y datos operativos necesarios para
              brindar el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">2. Uso de la información</h2>
            <p className="mt-2">
              Utilizamos la información para operar el software, mejorar sus funciones,
              procesar suscripciones, brindar soporte y mantener la seguridad de la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">3. Pagos</h2>
            <p className="mt-2">
              Los pagos son procesados por Paddle.com. Agente Advance no almacena datos
              completos de tarjetas de crédito.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">4. Propiedad y confidencialidad</h2>
            <p className="mt-2">
              El contenido y los datos cargados por el usuario siguen siendo del usuario.
              Agente Advance implementa medidas razonables para proteger la información y no la
              comercializa a terceros.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">5. Derechos del usuario</h2>
            <p className="mt-2">
              El usuario puede solicitar actualización o eliminación de sus datos y cancelar su
              cuenta o suscripción conforme a los términos del servicio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-slate-900">6. Contacto</h2>
            <p className="mt-2">
              Para consultas sobre privacidad o tratamiento de datos, el usuario puede
              comunicarse con Agente Advance mediante los canales informados en la plataforma.
            </p>
          </section>
        </div>

        <SiteFooter />
      </div>
    </div>
  );
}
