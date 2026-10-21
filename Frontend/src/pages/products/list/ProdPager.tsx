import { ChevronLeft, ChevronRight } from "lucide-react"
import { EN, I } from "./prodShared"

export function ProdPager({ page, pages, from, to, total, all, onPage }: { page: number; pages: number; from: number; to: number; total: number; all: number; onPage: (p: number) => void }) {
  return (
    <>
      <span className="num">Mostrando {from}{EN}{to} de {total} productos{total !== all ? ` (${all} en total)` : ""}</span>
      {pages > 1 && (
        <nav className="pgr" aria-label="Paginación">
          <button type="button" className="pb" aria-label="Página anterior" aria-disabled={page <= 1} onClick={() => { if (page > 1) onPage(page - 1) }}>{I(ChevronLeft, 18)}</button>
          <span className="cur num">Página {page} de {pages}</span>
          <button type="button" className="pb" aria-label="Página siguiente" aria-disabled={page >= pages} onClick={() => { if (page < pages) onPage(page + 1) }}>{I(ChevronRight, 18)}</button>
        </nav>
      )}
    </>
  )
}
