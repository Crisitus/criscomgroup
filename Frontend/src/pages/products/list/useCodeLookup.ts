import { useEffect, useState } from "react"
import { buscarProductoPorCodigoBarras } from "../../../services/codigoBarrasService"

/** Búsqueda exacta por código de barras (debounce 500 ms, desde 5 caracteres) como en la pantalla original. */
export function useCodeLookup(term: string) {
  const [hit, setHit] = useState<{ term: string; id: number | null } | null>(null)
  useEffect(() => {
    const t = term.trim()
    if (t.length < 5) return
    let live = true
    const timer = setTimeout(() => {
      buscarProductoPorCodigoBarras(t)
        .then(res => { if (live) setHit({ term: t, id: res?.producto?.id_producto ?? null }) })
        .catch(() => { if (live) setHit({ term: t, id: null }) })
    }, 500)
    return () => { live = false; clearTimeout(timer) }
  }, [term])
  const t = term.trim()
  return hit && hit.term === t && t.length >= 5 ? hit.id : null
}
