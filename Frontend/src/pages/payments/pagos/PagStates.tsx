import { CircleDashed, Clock, Lock, LogIn, RefreshCw, Server } from "lucide-react"
import { Btn, I } from "./pagCommon"

export function SkCard({ title, rows }: { title: string; rows: number }) {
  return (
    <section className="pa-card pa-clip" aria-busy="true" aria-label={`Cargando ${title}`}>
      <div className="pa-ch"><h2>{title}</h2><span className="pa-st pa-neu">{I(Clock, 14)}Cargando</span></div>
      {Array.from({ length: rows }, (_, i) => (
        <div className="pa-skr" key={i}><div style={{ flex: 1 }}><span className="pa-sk" style={{ width: `${36 + ((i * 9) % 30)}%`, marginBottom: 8 }} /><span className="pa-sk" style={{ width: `${62 - ((i * 7) % 24)}%`, height: 12 }} /></div></div>
      ))}
    </section>
  )
}

export function ErrCard({ title, what, code, message, onRetry }: { title: string; what: string; code: number | null; message: string; onRetry: () => void }) {
  return (
    <section className="pa-card" role="alert" aria-label={title}>
      <div className="pa-ch"><h2>{title}</h2><span className="pa-st pa-bad">{I(Server, 14)}{code ? `Error ${code}` : "Sin respuesta"}</span></div>
      <div className="pa-bst pa-bad">
        <span className="pa-bi2">{I(Server, 22)}</span>
        <div>
          <h3>No se pudo cargar {what}</h3>
          <p>{message || "El servidor no respondió."} Esto no es un vacío: tus datos no cambiaron. Los demás bloques de la pantalla siguen funcionando.</p>
          <div className="pa-r"><Btn out onClick={onRetry} icon={I(RefreshCw)}>Reintentar</Btn></div>
        </div>
      </div>
    </section>
  )
}

export function EmptyBlk({ title, children }: { title: string; children: string }) {
  return <div className="pa-bst"><span className="pa-bi2">{I(CircleDashed, 22)}</span><div><h3>{title}</h3><p>{children}</p></div></div>
}

export function Forbidden({ message }: { message: string }) {
  return (
    <section className="pa-card pa-pgst" role="alert">
      <div className="pa-bst">
        <span className="pa-bi2">{I(Lock, 22)}</span>
        <div>
          <h3>Sin permiso</h3>
          <p>{message || "No tienes permisos para acceder a esta funcionalidad."}</p>
          <p>Pagos y POS es para Gerencia (rol 1) o para quien tenga el área «pagos_pos». Reintentar no cambia este resultado.</p>
        </div>
      </div>
    </section>
  )
}

export function Unauth() {
  return (
    <section className="pa-card pa-pgst" role="alert">
      <div className="pa-bst pa-warn">
        <span className="pa-bi2">{I(LogIn, 22)}</span>
        <div>
          <h3>Tu sesión expiró</h3>
          <p>Inicia sesión de nuevo para ver Pagos y POS. No es un problema de permisos ni del servidor.</p>
          <div className="pa-r"><a className="pa-btn" href="/login">{I(LogIn)}Iniciar sesión</a></div>
        </div>
      </div>
    </section>
  )
}
