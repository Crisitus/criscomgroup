import { useEffect, useMemo, useState } from "react"
import { buscarProductoPorCodigoBarras } from "../../services/codigoBarrasService"
import { norm } from "../../components/erp/format"
import { PAGE, mg, type OfeRow, type Seg, type Sort } from "./ofeCalc"

export interface CodeHit { code: string; id: number | null; name: string }

/** Busca el código de barras exacto (con retardo, como la pantalla original) y devuelve el producto. */
function useCodeLookup(q: string): CodeHit | null {
  const [hit, setHit] = useState<CodeHit | null>(null)
  useEffect(() => {
    const code = q.trim()
    if (code.length < 5) { setHit(null); return }
    let dead = false
    const t = setTimeout(async () => {
      try {
        const res = await buscarProductoPorCodigoBarras(code)
        if (dead) return
        const p = res?.producto
        setHit(p ? { code, id: Number(p.id_producto), name: String(p.nombre) } : { code, id: null, name: "" })
      } catch {
        if (!dead) setHit({ code, id: null, name: "" })
      }
    }, 500)
    return () => { dead = true; clearTimeout(t) }
  }, [q])
  return hit
}

const byName = (a: OfeRow, b: OfeRow) => a.p.nombre.localeCompare(b.p.nombre, "es", { sensitivity: "base" })
const cur = (r: OfeRow) => r.offer ?? r.normal
const mval = (r: OfeRow) => { const m = mg(cur(r), r.cost); return m === null ? 1e9 : m }

const cmp: Record<Sort, (a: OfeRow, b: OfeRow) => number> = {
  oferta: (a, b) => (Number(b.offer !== null) - Number(a.offer !== null)) || byName(a, b),
  name_asc: byName,
  name_desc: (a, b) => byName(b, a),
  desc: (a, b) => ((b.pct ?? -1) - (a.pct ?? -1)) || byName(a, b),
  margen: (a, b) => (mval(a) - mval(b)) || byName(a, b),
  stock_asc: (a, b) => (a.p.stock - b.p.stock) || byName(a, b),
  stock_desc: (a, b) => (b.p.stock - a.p.stock) || byName(a, b),
  id_desc: (a, b) => b.id - a.id,
  id_asc: (a, b) => a.id - b.id,
}

export function useOfeFilter(rows: OfeRow[]) {
  const [q, setQ] = useState("")
  const [seg, setSeg] = useState<Seg>("all")
  const [cat, setCat] = useState("")
  const [sort, setSort] = useState<Sort>("oferta")
  const [page, setPage] = useState(1)
  const hit = useCodeLookup(q)

  const list = useMemo(() => {
    const n = norm(q.trim())
    const hitId = hit && hit.code === q.trim() ? hit.id : null
    return rows
      .filter(r => (seg === "on" ? r.offer !== null : seg === "off" ? r.offer === null : true))
      .filter(r => !cat || String(r.p.id_categoria) === cat)
      .filter(r => !n || norm(r.p.nombre).includes(n) || norm(r.p.sku).includes(n) || r.id === hitId)
      .sort((a, b) => cmp[sort](a, b) || a.id - b.id)
  }, [rows, q, seg, cat, sort, hit])

  const pages = Math.max(1, Math.ceil(list.length / PAGE))
  const cur1 = Math.min(page, pages)
  const pageRows = list.slice((cur1 - 1) * PAGE, cur1 * PAGE)
  const hasFilter = !!q.trim() || seg !== "all" || !!cat
  return {
    q, seg, cat, sort, list, pageRows, pages, page: cur1, hasFilter, hit,
    from: list.length ? (cur1 - 1) * PAGE + 1 : 0, to: Math.min(cur1 * PAGE, list.length),
    setQ: (v: string) => { setQ(v); setPage(1) },
    setSeg: (v: Seg) => { setSeg(v); setPage(1) },
    setCat: (v: string) => { setCat(v); setPage(1) },
    setSort: (v: Sort) => { setSort(v); setPage(1) },
    setPage,
    clear: () => { setQ(""); setSeg("all"); setCat(""); setPage(1) },
  }
}
