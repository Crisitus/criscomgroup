import { useMemo, useState } from "react"
import { FIL, type Filt, type Sort } from "./ProdKpi"
import { codeOf, norm, type Row } from "./prodShared"
import { useCodeLookup } from "./useCodeLookup"

export const PAGE = 25
const cmp = (a: Row, b: Row, s: Sort) => {
  switch (s) {
    case "name_desc": return b.p.nombre.localeCompare(a.p.nombre, "es", { sensitivity: "base" })
    case "id_desc": return b.id - a.id
    case "id_asc": return a.id - b.id
    case "stock_asc": return a.p.stock - b.p.stock
    case "stock_desc": return b.p.stock - a.p.stock
    case "margen": return (b.ck ? b.mu : -Infinity) - (a.ck ? a.mu : -Infinity)
    case "precio": return (a.offer ?? a.price) - (b.offer ?? b.price)
    default: return a.p.nombre.localeCompare(b.p.nombre, "es", { sensitivity: "base" })
  }
}

export function useProdFilter(rows: Row[], startPage: number) {
  const [q, setQ] = useState("")
  const [f, setF] = useState<Filt>("todos")
  const [cat, setCat] = useState("all")
  const [sort, setSort] = useState<Sort>("name_asc")
  const [page, setPage] = useState(startPage)
  const codeHit = useCodeLookup(q)

  const list = useMemo(() => {
    const n = norm(q.trim())
    return rows
      .filter(r => FIL[f](r) && (cat === "all" || String(r.p.id_categoria) === cat))
      .filter(r => !n || norm(r.p.nombre).includes(n) || norm(r.p.sku).includes(n) || r.id === codeHit || (r.p.codigos_barras || []).some(c => codeOf(c).toLowerCase().includes(n)))
      .sort((a, b) => cmp(a, b, sort) || a.id - b.id)
  }, [rows, q, f, cat, sort, codeHit])

  const pages = Math.max(1, Math.ceil(list.length / PAGE))
  const cur = Math.min(page, pages)
  const pageRows = list.slice((cur - 1) * PAGE, cur * PAGE)
  const hasFilter = !!q.trim() || f !== "todos" || cat !== "all"
  return {
    q, f, cat, sort, list, codeHit, pageRows, pages, page: cur, hasFilter,
    from: list.length ? (cur - 1) * PAGE + 1 : 0, to: Math.min(cur * PAGE, list.length),
    setQ: (v: string) => { setQ(v); setPage(1) },
    setF: (v: Filt) => { setF(v); setQ(""); setPage(1) },
    setCat: (v: string) => { setCat(v); setPage(1) },
    setSort: (v: Sort) => { setSort(v); setPage(1) },
    setPage,
    clear: () => { setQ(""); setF("todos"); setCat("all"); setPage(1) },
  }
}
