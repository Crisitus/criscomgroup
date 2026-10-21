import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import type { LucideIcon } from "lucide-react"
import { CircleCheck, Clock, Inbox, KeyRound, LogIn, Lock, RefreshCw, SearchX, TriangleAlert, X } from "lucide-react"
import { I } from "./audParts"

export type AudStateKind = "403" | "401" | "err" | "empty" | "emptyf"

function Card({ icon, tone, title, children, action, alert }: { icon: LucideIcon; tone?: string; title: string; children?: ReactNode; action?: ReactNode; alert?: boolean }) {
  return (
    <div className="stc" role={alert ? "alert" : "status"}>
      <div className="empty">
        <div className={`ei ${tone ?? ""}`}>{I(icon, 22)}</div>
        <h2>{title}</h2>
        {children}
        {action}
      </div>
    </div>
  )
}

const QUIENES = ["Gerente (rol 1)", "Auditor temporal (rol 5), mientras su acceso esté vigente", "Superusuario temporal vigente", "Quien tenga el permiso de área «auditoria»"]

/** Estados de la lista: sin permiso, sesion caducada, error (con Reintentar), vacio real y vacio por filtro. */
export function AudState({ kind, msg, onRetry, onClear }: { kind: AudStateKind; msg?: string; onRetry: () => void; onClear: () => void }) {
  if (kind === "403") {
    return (
      <Card icon={Lock} title="Sin permiso para ver los logs de auditoría" action={<Link className="btn" to="/access-center">{I(KeyRound, 16)}Solicitar acceso</Link>}>
        <p>Tu acceso a este módulo no está vigente o tu rol no lo incluye. Pueden consultarlo:</p>
        <ul>{QUIENES.map(q => <li key={q}>{I(CircleCheck, 16)}{q}</li>)}</ul>
        <p className="sub" style={{ marginTop: 6 }}>Pide el permiso de área «auditoria» desde Solicitudes de acceso.</p>
      </Card>
    )
  }
  if (kind === "401") {
    return (
      <Card icon={Clock} tone="warn" title="Tu sesión caducó" action={<Link className="btn" to="/login">{I(LogIn, 16)}Iniciar sesión</Link>}>
        <p>Inicia sesión de nuevo para ver los logs de auditoría.</p>
      </Card>
    )
  }
  if (kind === "err") {
    return (
      <Card icon={TriangleAlert} tone="bad" alert title="No se pudieron cargar los logs" action={<button type="button" className="btn" onClick={onRetry}>{I(RefreshCw, 16)}Reintentar</button>}>
        <p>{msg || "Error interno del servidor."} Tus filtros siguen aplicados.</p>
      </Card>
    )
  }
  if (kind === "emptyf") {
    return (
      <Card icon={SearchX} title="Ningún log coincide con estos filtros" action={<button type="button" className="btn" onClick={onClear}>{I(X, 16)}Limpiar filtros</button>}>
        <p>Prueba con otro rango de fechas o quita algún filtro.</p>
      </Card>
    )
  }
  return (
    <Card icon={Inbox} title="Todavía no hay logs de auditoría">
      <p>Las acciones de las personas del ERP aparecerán aquí en cuanto ocurran.</p>
    </Card>
  )
}
