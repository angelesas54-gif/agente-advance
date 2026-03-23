export default function CustomerTable({
  busqueda,
  clientes,
  clientesCargando,
  freeCustomerLimitReached,
  onBusquedaChange,
  onDeleteCustomer,
  onEditCustomer,
  onNewCustomer,
  onUpgradePlan,
  obtenerColorSemaforo,
  obtenerFechaCritica,
}) {
  return (
    <>
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Buscar cliente..."
          className="flex-1 p-4 bg-white rounded-3xl shadow-sm font-bold border-2 border-transparent focus:border-blue-500 outline-none transition-all"
          value={busqueda}
          onChange={(event) => onBusquedaChange(event.target.value)}
        />

        {freeCustomerLimitReached ? (
          <div className="relative group">
            <button
              type="button"
              onClick={() => onUpgradePlan?.()}
              className="relative bg-[#001f3f] text-white p-4 rounded-3xl shadow-lg font-bold transition-transform opacity-70"
            >
              <span className="absolute inset-0 rounded-3xl bg-slate-300/25 border border-white/20" />
              <span className="relative">PLAN PRO</span>
            </button>

            <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-amber-200 bg-white/95 px-3 py-2 text-[10px] font-black uppercase text-amber-600 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              Esta función es exclusiva para el Plan PRO 🚀
            </div>
          </div>
        ) : (
          <button
            onClick={onNewCustomer}
            className="bg-[#001f3f] text-white p-4 rounded-3xl shadow-lg font-bold hover:scale-105 transition-transform"
          >
            + NUEVO
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clientes.map((cliente) => (
          <div
            key={cliente.id}
            onClick={() => onEditCustomer(cliente)}
            className="p-4 bg-white rounded-2xl shadow-sm border flex justify-between items-center hover:bg-slate-50 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${obtenerColorSemaforo(cliente)}`} />

              <div>
                <p className="font-black uppercase text-black text-sm">{cliente.nombre}</p>

                {cliente.motivo_consulta && (
                  <p className="text-[10px] text-[#4B2C82] font-bold">
                    {cliente.motivo_consulta}
                  </p>
                )}

                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  {cliente.rol} •
                  {cliente.proxima_visita &&
                  obtenerFechaCritica(cliente) === cliente.proxima_visita.substring(0, 10)
                    ? ` 📅 VISITA: ${cliente.proxima_visita.split('-').reverse().join('/')}`
                    : ` ${cliente.motivo_alerta || 'SIN AGENDA'}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteCustomer(cliente.id);
                }}
                className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {clientesCargando && (
        <p className="text-center text-slate-400 font-bold uppercase py-10">
          Cargando clientes...
        </p>
      )}

      {!clientesCargando && clientes.length === 0 && (
        <p className="text-center text-slate-400 font-bold uppercase py-10">
          No hay clientes para mostrar
        </p>
      )}
    </>
  );
}
