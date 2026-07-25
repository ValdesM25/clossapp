import Link from "next/link"
import { LEGAL_CONTACTO, REDES_ACTIVAS } from "@/constants/legal"

/**
 * Pie de sitio. Se renderiza al final del contenedor scrolleable, por encima
 * del BottomNav flotante — de ahí el margen inferior generoso.
 */
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-zinc-200 px-4 pt-6 flex flex-col gap-5">
      {REDES_ACTIVAS.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Síguenos</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {REDES_ACTIVAS.map((red) => (
              <a key={red.id} href={red.url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
                {red.label}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Clossapp</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          <Link href="/politicas"
            className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
            Políticas y términos
          </Link>
          <a href={`mailto:${LEGAL_CONTACTO}`}
            className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors">
            Soporte
          </a>
        </div>
      </div>

      <p className="text-[11px] text-zinc-400 leading-relaxed">
        © {new Date().getFullYear()} Clossapp · Saltillo, Coahuila, México
      </p>
    </footer>
  )
}
