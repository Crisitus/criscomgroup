import type { LucideIcon } from "lucide-react"
import { FileText, Inbox, Lock, RefreshCw, SearchX, ServerCrash, WifiOff } from "lucide-react"
import { I } from "./sunShared"
import { type Status } from "./sunCommon"

export function BlockError({ status, what, message, onRetry }: { status: Status; what: string; message: string; onRetry: () => void }) {
  const [Icon, tone, title, detail]: [LucideIcon, string, string, string] =
    status === "403" ? [Lock, "bad", `No tienes permisos para ver ${what}.`, "Este bloque no se cargó; el resto de la pantalla sigue disponible."]
    : status === "red" ? [WifiOff, "warn", "No se pudo conectar con el servidor", `No se pudo cargar ${what}. Revisa tu conexión e inténtalo de nuevo.`]
    : [ServerCrash, "bad", "Error en el servidor al procesar la facturación", `No se pudo cargar ${what}. El resto de la pantalla sigue disponible.`]
  return (
    <section className="card empty" role="alert">
      <div className={`ei ${tone}`}>{I(Icon, 22)}</div>
      <h2>{title}</h2>
      <p>{detail}</p>
      {message && status !== "403" && status !== "red" && message !== title && <p className="susub">{message}</p>}
      <button type="button" className="btn out" onClick={onRetry}>{I(RefreshCw)}Reintentar</button>
    </section>
  )
}

export const EmptyEmitters = () => (
  <section className="card empty">
    <div className="ei">{I(Inbox, 22)}</div>
    <h2>Aún no hay emisores con RUC 10</h2>
    <p>Cuando una empresa con RUC 10 esté habilitada para facturar, aparecerá aquí.</p>
  </section>
)

export const EmptyDocs = () => (
  <div className="empty">
    <div className="ei">{I(FileText, 22)}</div>
    <h2>Aún no se ha emitido ningún comprobante</h2>
    <p>Los comprobantes electrónicos aparecerán aquí cuando se emitan.</p>
  </div>
)

export const NoResults = ({ word, onAll }: { word: string; onAll: () => void }) => (
  <div className="empty">
    <div className="ei">{I(SearchX, 22)}</div>
    <h2>Sin resultados con este filtro</h2>
    <p>No hay comprobantes en estado {word}.</p>
    <button type="button" className="btn out" onClick={onAll}>Ver todos</button>
  </div>
)

export const EmitterSkeleton = () => (
  <div className="card ecard" aria-busy="true">
    <span className="skb" style={{ width: "70%", height: 18 }} /><span className="skb" style={{ width: "55%", height: 14 }} />
    <span className="skb" style={{ width: "85%", height: 14 }} /><span className="skb" style={{ width: "100%", height: 40, marginTop: 6 }} />
    <span className="skb" style={{ width: "75%", height: 14 }} /><span className="skb" style={{ width: "60%", height: 44, marginTop: 6 }} />
  </div>
)
