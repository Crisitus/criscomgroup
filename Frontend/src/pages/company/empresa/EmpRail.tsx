import { useCallback, useEffect, useRef, useState } from "react"
import { CircleAlert } from "lucide-react"
import { EMP_SECS, type EmpFlag, type EmpSec } from "./empForm"
import { ic } from "./empParts"

/** Navegacion por secciones: menu lateral (escritorio) o chips fijos (movil), con la seccion visible resaltada. */
export function EmpRail({ flags, mob }: { flags: Partial<Record<EmpSec, EmpFlag>>; mob: boolean }) {
  const nav = useRef<HTMLElement>(null)
  const [active, setActive] = useState<EmpSec>("ident")
  const zone = useCallback(() => nav.current?.closest<HTMLElement>(".zn") ?? null, [])

  useEffect(() => {
    const z = zone()
    if (!z) return
    const onScroll = () => {
      const zt = z.getBoundingClientRect().top
      let cur: EmpSec = "ident"
      for (const [k] of EMP_SECS) {
        const el = z.querySelector<HTMLElement>(`[data-sec="${k}"]`)
        if (el && el.getBoundingClientRect().top - zt <= (mob ? 90 : 40)) cur = k
      }
      if (z.scrollTop + z.clientHeight >= z.scrollHeight - 4) cur = EMP_SECS[EMP_SECS.length - 1][0]
      setActive(cur)
    }
    onScroll()
    z.addEventListener("scroll", onScroll, { passive: true })
    return () => z.removeEventListener("scroll", onScroll)
  }, [zone, mob])

  const go = (k: EmpSec) => {
    const z = zone()
    const el = z?.querySelector<HTMLElement>(`[data-sec="${k}"]`)
    if (!z || !el) return
    const top = el.getBoundingClientRect().top - z.getBoundingClientRect().top + z.scrollTop - (mob ? 64 : 20)
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    z.scrollTo({ top, behavior: calm ? "auto" : "smooth" })
    setActive(k)
  }

  if (mob) {
    return (
      <nav ref={nav} className="crs" aria-label="Secciones">
        {EMP_SECS.map(([k, n]) => (
          <button key={k} type="button" className="chip" aria-current={k === active ? "true" : undefined} onClick={() => go(k)}>
            {flags[k] === "err" ? ic(CircleAlert, 14, "bad") : flags[k] === "chg" ? <span className="dot" aria-hidden="true" /> : null}
            {n}
            {flags[k] === "err" && <span className="sr">con errores</span>}
            {flags[k] === "chg" && <span className="sr">con cambios</span>}
          </button>
        ))}
      </nav>
    )
  }
  return (
    <nav ref={nav} className="rail" aria-label="Secciones de Empresa">
      {EMP_SECS.map(([k, n]) => (
        <button key={k} type="button" className="ri" aria-current={k === active ? "true" : undefined} onClick={() => go(k)}>
          {n}
          {flags[k] === "err" && <span className="fg bad">{ic(CircleAlert, 16)}<span className="sr">con errores</span></span>}
          {flags[k] === "chg" && <span className="fg"><span className="dot" aria-hidden="true" /><span className="sr">con cambios</span></span>}
        </button>
      ))}
    </nav>
  )
}
