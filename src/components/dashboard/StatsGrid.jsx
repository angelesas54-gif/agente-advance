const CARDS = [
  {
    id: 'urgente',
    label: '🔴 Atrasados',
    valueClassName: 'text-red-600',
    borderClassName: 'border-red-500',
  },
  {
    id: 'hoy',
    label: '🟢 Hoy',
    valueClassName: 'text-green-600',
    borderClassName: 'border-green-500',
  },
  {
    id: 'proximos',
    label: '🔵 Próximos',
    valueClassName: 'text-[#4B2C82]',
    borderClassName: 'border-blue-500',
  },
];

export default function StatsGrid({ counts, onSelectFilter }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-3">
        {CARDS.map((card) => (
          <div
            key={card.id}
            onClick={() => onSelectFilter(card.id)}
            className={`bg-white border-b-8 ${card.borderClassName} p-6 rounded-2xl shadow-xl cursor-pointer text-center active:scale-95 transition-all`}
          >
            <p className={`text-[10px] font-black uppercase ${card.valueClassName}`}>
              {card.label}
            </p>
            <p className="text-4xl font-black">{counts[card.id] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="w-full flex flex-wrap items-center gap-x-6 gap-y-4 mb-8 px-4 py-3 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[9px] font-black text-slate-500 uppercase italic">
            Atrasados (+48h)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[9px] font-black text-slate-500 uppercase italic">
            Próximos Seguimientos
          </span>
        </div>

        <div className="h-4 w-[1px] bg-slate-300 hidden md:block" />

        <div className="flex items-center gap-2">
          <span className="text-amber-500 text-xs font-black">💡</span>
          <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest leading-tight">
            TIP: Entrá a la ficha para generar{' '}
            <span
              title="Hacé clic en un cliente seleccionado como comprador para completar su ficha y gestionar sus documentos PDF."
              className="text-[#4B2C82] underline cursor-help hover:text-[#3B2266] transition-colors"
            >
              PDF
            </span>{' '}
            y{' '}
            <span
              title="Los reportes de mercado se generan automáticamente desde el cliente vendedor en la ficha debajo de la agenda."
              className="text-[#4B2C82] underline cursor-help hover:text-[#3B2266] transition-colors"
            >
              ACM
            </span>
          </p>
        </div>
      </div>
    </>
  );
}
