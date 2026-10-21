import { ChevronLeft, ChevronRight } from "lucide-react"
import { EN } from "./ofeCalc"
import { I } from "./ofeShared"

const win = (page: number, pages: number): (number | null)[] => {
  const s = Array.from(new Set([1, pages, page - 1, page, page + 1].filter(n => n >= 1 && n <= pages))).sort((a, b) => a - b)
  const out: (number | null)[] = []
  s.forEach((n, i) => { if (i && n - s[i - 1] > 1) out.push(null); out.push(n) })
  return out
}

export function OfePager({ from, to, total, page, pages, onPage }: { from: number; to: number; total: number; page: number; pages: number; onPage: (n: number) => void }) {
  return (
    <div className="pgf">
      <span>Mostrando <b className="num">{from}{EN}{to}</b> de <b className="num">{total}</b> productos</span>
      <nav className="pg1" aria-label="Paginación">
        <button type="button" className="pb" aria-label="Página anterior" aria-disabled={page <= 1 || undefined} onClick={() => { if (page > 1) onPage(page - 1) }}>{I(ChevronLeft, 16)}</button>
        {win(page, pages).map((n, i) => n === null
          ? <span key={`g${i}`} className="mut" aria-hidden>…</span>
          : <button key={n} type="button" className="pb num" aria-current={n === page ? "page" : undefined} aria-label={`Página ${n}`} onClick={() => onPage(n)}>{n}</button>)}
        <button type="button" className="pb" aria-label="Página siguiente" aria-disabled={page >= pages || undefined} onClick={() => { if (page < pages) onPage(page + 1) }}>{I(ChevronRight, 16)}</button>
      </nav>
    </div>
  )
}
