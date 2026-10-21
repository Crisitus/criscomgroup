import { ChevronLeft, ChevronRight } from "lucide-react"
import { I } from "./purchasesShared"

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  const from = Math.max(1, Math.min(page - 2, pages - 4))
  const nums = Array.from({ length: Math.min(5, pages) }, (_, i) => from + i)
  return (
    <div className="pg1">
      <button type="button" className="pb" aria-disabled={page <= 1} aria-label="Página anterior" onClick={() => page > 1 && onPage(page - 1)}>{I(ChevronLeft, 18)}</button>
      {nums.map(n => (
        <button type="button" key={n} className="pb num" aria-current={n === page ? "page" : undefined} aria-label={`Página ${n}`} onClick={() => onPage(n)}>{n}</button>
      ))}
      <button type="button" className="pb" aria-disabled={page >= pages} aria-label="Página siguiente" onClick={() => page < pages && onPage(page + 1)}>{I(ChevronRight, 18)}</button>
    </div>
  )
}
