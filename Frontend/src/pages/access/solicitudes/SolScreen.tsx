import { useAuth } from "../../../contexts/AuthContext"
import { SolBandeja } from "./SolBandeja"
import { SolForm } from "./SolForm"
import { SolPermisos } from "./SolPermisos"
import { SolSolicitudes } from "./SolSolicitudes"
import { useSolAccess } from "./useSolAccess"

/** Solicitudes de acceso: mis permisos, solicitar otra área, mis solicitudes y (maestra) la bandeja. */
export function SolScreen() {
  const { user } = useAuth()
  const isMaster = Boolean(user?.es_maestra)
  const a = useSolAccess(isMaster)
  return (
    <div className="pg">
      <div className="hd">
        <h1>Solicitudes de acceso</h1>
        <span className="sub">Pide acceso a otra área y sigue tus solicitudes</span>
      </div>
      <div className="grid">
        <SolPermisos status={a.myStatus} grants={a.my.grants} onRetry={() => void a.loadMy()} />
        <SolForm status={a.myStatus} areas={a.my.areas} onSubmit={a.request} />
        <SolSolicitudes status={a.myStatus} requests={a.my.requests} onRetry={() => void a.loadMy()} />
      </div>
      {isMaster && <SolBandeja status={a.trayStatus} rows={a.rows} onReload={() => void a.loadTray()} onResolve={a.resolve} />}
    </div>
  )
}
