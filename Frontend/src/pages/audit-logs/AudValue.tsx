import { ChevronDown } from "lucide-react"
import { limpiarJson } from "./audCommon"
import { I } from "./audParts"

function leerJson(v: unknown): unknown {
  if (typeof v !== "string") return v !== null && typeof v === "object" ? v : null
  const t = v.trim()
  if (!/^[[{]/.test(t)) return null
  try { return JSON.parse(t) } catch { return null }
}
const un = (x: unknown) => (x !== null && typeof x === "object" ? JSON.stringify(x) : String(x))
const entradas = (o: Record<string, unknown>) => Object.entries(o).map(([k, v]) => `${k}: ${un(v)}`)

/** Valor de un campo: texto, vacio, Si/No o lista/objeto plegado ("Lista de 2 elementos"). */
export function AudValue({ v, abierto }: { v: unknown; abierto?: boolean }) {
  if (v === null || v === undefined) return <i>(sin valor)</i>
  if (v === "") return <i>(texto vacío)</i>
  if (typeof v === "boolean") return <>{v ? "Sí" : "No"}</>
  const j = leerJson(v)
  if (j !== null) {
    const limpio = limpiarJson(j)
    const arr = Array.isArray(limpio)
    const n = arr ? limpio.length : Object.keys(limpio as object).length
    const lab = arr ? `Lista de ${n} elemento${n !== 1 ? "s" : ""}` : `Objeto de ${n} campo${n !== 1 ? "s" : ""}`
    const items = arr ? (limpio as unknown[]).map(e => (e !== null && typeof e === "object" ? entradas(e as Record<string, unknown>).join(" · ") : String(e))) : entradas(limpio as Record<string, unknown>)
    return (
      <details className="ex" open={abierto}>
        <summary>{lab}{I(ChevronDown, 16, "chev")}</summary>
        <ol>{items.map((it, i) => <li key={i}>{it}</li>)}</ol>
      </details>
    )
  }
  return <>{String(v)}</>
}
