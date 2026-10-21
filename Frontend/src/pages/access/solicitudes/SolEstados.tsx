import { CircleAlert, RefreshCw } from "lucide-react"
import type { ReactNode } from "react"

/** Esqueleto de bloque (sin animación), accesible como estado de carga. */
export function SolSkeleton({ shapes }: { shapes: ("h" | "t" | "")[] }) {
  return (
    <div className="skl" aria-busy="true" role="status">
      <span className="sr">Cargando…</span>
      {shapes.map((c, i) => <span key={i} className={`sk${c ? ` ${c}` : ""}`} />)}
    </div>
  )
}

/** Error de bloque con Reintentar: distinto del vacío, nunca mudo. */
export function SolRetry({ title, detail, onRetry }: { title: string; detail: string; onRetry: () => void }) {
  return (
    <div className="errb" role="alert">
      <div className="why bad">
        <CircleAlert className="ic" size={16} strokeWidth={1.75} aria-hidden="true" />
        <span><b>{title}</b><br />{detail}</span>
      </div>
      <button className="btn out" type="button" onClick={onRetry}>
        <RefreshCw className="ic" size={16} strokeWidth={1.75} aria-hidden="true" />Reintentar
      </button>
    </div>
  )
}

/** Vacío con texto propio por bloque. */
export function SolEmpty({ title, children, centered }: { title: string; children: ReactNode; centered?: boolean }) {
  return (
    <div className={`eb${centered ? " c" : ""}`}>
      <h3>{title}</h3>
      <span>{children}</span>
    </div>
  )
}

/** Aviso en línea (éxito, 403, 409…): icono + palabra, rol según tono. */
export function SolAlert({ tone, icon, title, children, extra }: {
  tone: "ok" | "warn" | "bad" | "neu"; icon: ReactNode; title: string; children?: ReactNode; extra?: ReactNode
}) {
  return (
    <div className={`alert ${tone}`} role={tone === "ok" ? "status" : "alert"}>
      {icon}
      <div className="bd"><span><b>{title}</b> {children}</span>{extra}</div>
    </div>
  )
}
