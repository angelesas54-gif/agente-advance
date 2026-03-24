export default function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-slate-200 pt-6 text-center">
      <div className="flex flex-wrap items-center justify-center gap-4">
        <a
          href="/terminos-y-condiciones"
          className="text-sm font-semibold text-[#4B2C82] underline underline-offset-4"
        >
          Términos y Condiciones
        </a>
        <a
          href="/privacidad"
          className="text-sm font-semibold text-[#4B2C82] underline underline-offset-4"
        >
          Política de Privacidad
        </a>
      </div>
    </footer>
  );
}
