import { useEffect, useState } from "react"
import { ChevronDown, Search } from "lucide-react"
import { I } from "./comShared"

export interface MemberQuery { q: string; estado: "" | "activo" | "baja"; fuente: string; page: number; limit: number }

export function MemberFilters({ mq, set, counts }: { mq: MemberQuery; set: (p: Partial<MemberQuery>) => void; counts: { total: number; activos: number; bajas: number } }) {
  const [text, setText] = useState(mq.q)
  useEffect(() => { setText(mq.q) }, [mq.q])
  useEffect(() => {
    if (text === mq.q) return
    const t = setTimeout(() => set({ q: text, page: 1 }), 300)
    return () => clearTimeout(t)
  }, [text, mq.q, set])
  const chips: [MemberQuery["estado"], string, number][] = [["", "Todos", counts.total], ["activo", "Activos", counts.activos], ["baja", "Bajas", counts.bajas]]
  return (
    <div className="fbar" role="search">
      <label className="fld q">{I(Search, 16)}<input type="search" placeholder="Buscar correo o nombre" value={text} onChange={e => setText(e.target.value)} aria-label="Buscar por correo o nombre" /></label>
      {chips.map(([v, l, n]) => (
        <button type="button" key={l} className="chp" aria-pressed={mq.estado === v} onClick={() => set({ estado: v, page: 1 })}>{l}<span className="n">{n}</span></button>
      ))}
      <span className="sel">
        <select aria-label="Fuente" value={mq.fuente} onChange={e => set({ fuente: e.target.value, page: 1 })}>
          <option value="">Fuente: todas</option><option value="footer">Fuente: footer</option><option value="registro">Fuente: registro</option>
        </select>{I(ChevronDown, 16)}
      </span>
      <span className="sel">
        <select aria-label="Tamaño de página" value={mq.limit} onChange={e => set({ limit: Number(e.target.value), page: 1 })}>
          {[25, 50, 100].map(n => <option key={n} value={n}>{n} / pág.</option>)}
        </select>{I(ChevronDown, 16)}
      </span>
    </div>
  )
}
