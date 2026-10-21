import type { MouseEvent, ReactNode } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { I } from "./pvParts"
import type { PostventaList } from "./usePostventaList"

/** Paginacion en servidor. Escritorio: en la cabecera; movil: al pie de la lista. */
export function PvPager({ list, mob = false, lead }: { list: PostventaList; mob?: boolean; lead?: ReactNode }) {
  const ok = list.status === "ok"
  const label = ok ? (list.total ? `${list.from}–${list.to} de ${list.total}` : "0 resultados") : ""
  const prev = list.page <= 1 || !ok
  const next = list.page >= list.pages || !ok
  const go = (n: number, off: boolean) => (ev: MouseEvent) => { ev.preventDefault(); if (!off) list.setPage(n) }
  const btn = (dir: "prev" | "next") => {
    const off = dir === "prev" ? prev : next
    const txt = dir === "prev" ? (off ? "Página anterior (estás en la primera)" : "Página anterior") : (off ? "Página siguiente (no hay más)" : "Página siguiente")
    return (
      <button type="button" className="btn out sq" aria-disabled={off || undefined} aria-label={txt} onClick={go(list.page + (dir === "prev" ? -1 : 1), off)}>
        {I(dir === "prev" ? ChevronLeft : ChevronRight, 18)}
      </button>
    )
  }
  if (mob) {
    if (!ok || list.pages <= 1) return null
    return <div className="mpager">{btn("prev")}<span className="num" role="status">{label}</span>{btn("next")}</div>
  }
  return <div className="pgr num">{lead}<span role="status">{label}</span>{btn("prev")}{btn("next")}</div>
}
