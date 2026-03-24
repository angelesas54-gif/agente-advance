import { useState } from 'react';

function ClienteForm({ onCancel }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [motivoConsulta, setMotivoConsulta] = useState('');
  const [linkOriginal, setLinkOriginal] = useState('');
  const [inmobiliaria, setInmobiliaria] = useState('');
  const [telefonoColega, setTelefonoColega] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  return (
    <div className="mt-4 w-full overflow-x-hidden">
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-center text-2xl font-black text-[#4B2C82]">Registro</h2>

          <div className="space-y-3">
            <input
              id="cliente-nombre"
              name="cliente_nombre"
              type="text"
              placeholder="Nombre"
              className="w-full rounded-xl border border-slate-200 p-3"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
            />

            <input
              id="cliente-telefono"
              name="cliente_telefono"
              type="text"
              placeholder="Telefono"
              className="w-full rounded-xl border border-slate-200 p-3"
              value={telefono}
              onChange={(event) => setTelefono(event.target.value)}
            />

            <input
              id="cliente-motivo"
              name="cliente_motivo"
              type="text"
              placeholder="Motivo de consulta"
              className="w-full rounded-xl border border-slate-200 p-3"
              value={motivoConsulta}
              onChange={(event) => setMotivoConsulta(event.target.value)}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-green-200 bg-green-50 p-6">
          <h3 className="mb-4 text-center text-2xl font-black text-green-700">
            Ficha Comprador
          </h3>

          <div className="space-y-3">
            <input
              id="ficha-link-original"
              name="ficha_link_original"
              type="text"
              placeholder="Link Original"
              className="w-full rounded-xl border border-green-200 p-3"
              value={linkOriginal}
              onChange={(event) => setLinkOriginal(event.target.value)}
            />

            <input
              id="ficha-inmobiliaria"
              name="ficha_inmobiliaria"
              type="text"
              placeholder="Inmobiliaria"
              className="w-full rounded-xl border border-green-200 p-3"
              value={inmobiliaria}
              onChange={(event) => setInmobiliaria(event.target.value)}
            />

            <input
              id="ficha-telefono-colega"
              name="ficha_telefono_colega"
              type="text"
              placeholder="Telefono Colega"
              className="w-full rounded-xl border border-green-200 p-3"
              value={telefonoColega}
              onChange={(event) => setTelefonoColega(event.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowSuccessModal(true)}
            className="mt-4 w-full rounded-xl bg-green-600 p-4 font-black uppercase text-white"
          >
            Guardar ficha
          </button>
        </section>

        {typeof onCancel === 'function' && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-xl border border-slate-200 bg-white p-4 font-black uppercase text-slate-600"
          >
            Volver
          </button>
        )}
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="text-center">
              <h3 className="text-2xl font-black text-emerald-700">Modal de exito</h3>
              <p className="mt-3 text-sm text-slate-500">El boton verde solo abre este modal.</p>
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="mt-4 w-full rounded-xl bg-[#001f3f] p-3 font-black uppercase text-white"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClienteForm;