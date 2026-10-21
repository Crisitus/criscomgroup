import { Building2, Loader, Lock, Plus, RefreshCw, TriangleAlert } from "lucide-react"
import { ic } from "./empParts"

/** Cargando: esqueleto + texto (nunca pantalla completa ni circulo con degradado). */
export function EmpLoading({ what, hours = false }: { what: string; hours?: boolean }) {
  const card = (n: number) => (
    <div className="skc">{Array.from({ length: n }, (_, i) => <div key={i} className="sk" style={{ width: `${[40, 100, 72, 56][i % 4]}%` }} />)}</div>
  )
  return (
    <div className="zn">
      <div className="st neu" role="status" aria-busy="true">{ic(Loader, 16)}Cargando {what}…</div>
      {hours
        ? <div className="hz">{card(4)}{card(4)}</div>
        : <div className="sks">
            <div className="cl">{Array.from({ length: 6 }, (_, i) => <div key={i} className="sk" style={{ height: 20, margin: "12px 10px" }} />)}</div>
            <div className="cl">{card(4)}{card(3)}</div>
          </div>}
    </div>
  )
}

export function EmpEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="zn"><div className="es">
      <div className="ei">{ic(Building2, 22)}</div>
      <h2>Aún no hay una empresa registrada</h2>
      <p>La empresa emisora aparece aquí cuando se registra. Hace falta para facturar a SUNAT y para configurar el horario laboral.</p>
      <button type="button" className="btn" onClick={onCreate}>{ic(Plus, 16)}Registrar empresa</button>
    </div></div>
  )
}

export function EmpNoCompany({ onGoto }: { onGoto: () => void }) {
  return (
    <div className="zn"><div className="es">
      <div className="ei">{ic(Building2, 22)}</div>
      <h2>Aún no hay una empresa: no hay horario que configurar</h2>
      <p>El horario laboral pertenece a la empresa emisora (404). Registra la empresa primero.</p>
      <button type="button" className="btn out" onClick={onGoto}>Ir a Empresa</button>
    </div></div>
  )
}

export function EmpError({ what, message, onRetry }: { what: string; message?: string; onRetry: () => void }) {
  return (
    <div className="zn"><div className="es bad" role="alert">
      <div className="ei">{ic(TriangleAlert, 22)}</div>
      <h2>No se pudieron cargar {what}</h2>
      <p>{message || "El servidor respondió con un error (500) o no hubo conexión."} No se modificó nada.</p>
      <button type="button" className="btn" onClick={onRetry}>{ic(RefreshCw, 16)}Reintentar</button>
    </div></div>
  )
}

/** 403: sin Reintentar; dice que rol hace falta. */
export function EmpForbidden({ reason, role = "Gerencia (rol 1)" }: { reason: string; role?: string }) {
  return (
    <div className="zn"><div className="es" role="alert">
      <div className="ei">{ic(Lock, 22)}</div>
      <h2>Sin permiso para ver esta pestaña</h2>
      <p>{reason} Tu rol actual no tiene acceso; pide a Gerencia que haga el cambio.</p>
      <span className="tag">Rol necesario: {role}</span>
    </div></div>
  )
}
