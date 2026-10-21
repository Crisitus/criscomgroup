import { ChevronLeft, ChevronRight } from "lucide-react"
import { EN, I } from "./comShared"

export function MemberPager({ page, limit, total, shown, set, bare }: { page: number; limit: number; total: number; shown: number; set: (page: number) => void; bare?: boolean }) {
  const pages = Math.max(1, Math.ceil(total / limit))
  const from = total ? (page - 1) * limit + 1 : 0
  const nums = Array.from(new Set([1, page - 1, page, page + 1, pages])).filter(n => n >= 1 && n <= pages).sort((a, b) => a - b)
  return (
    <div className={bare ? "ctx pgb" : "pgf"}>
      <span>Mostrando {from}{EN}{from + shown - (shown ? 1 : 0)} de {total} miembros</span>
      <span className="rt">
        <button type="button" className="pb" aria-label="Página anterior" aria-disabled={page <= 1 || undefined} onClick={() => page > 1 && set(page - 1)}>{I(ChevronLeft, 18)}</button>
        {nums.map(n => <button type="button" key={n} className="pb" aria-label={`Página ${n}`} aria-current={n === page ? "page" : undefined} onClick={() => set(n)}>{n}</button>)}
        <button type="button" className="pb" aria-label="Página siguiente" aria-disabled={page >= pages || undefined} onClick={() => page < pages && set(page + 1)}>{I(ChevronRight, 18)}</button>
      </span>
    </div>
  )
}
