import { Link } from "react-router-dom"
import { ChevronRight, Lock } from "lucide-react"
import { I } from "./maeParts"

/** 403 completo para quien no es la maestra: sin campos ni lista, con salida. */
export function MaeDenied() {
  return (
    <div className="pg">
      <div className="ph"><h1>Cuenta maestra</h1></div>
      <section className="card nom" aria-labelledby="mae-nh">
        <span className="ico">{I(Lock, 28)}</span>
        <div className="bd">
          <span className="tag" style={{ alignSelf: "flex-start" }}>403 · Acceso denegado</span>
          <h2 id="mae-nh">Esta pantalla es solo para la cuenta maestra</h2>
          <p>La cuenta con la que entraste no es la cuenta maestra, por eso aquí no se muestran los datos de la cuenta ni los permisos concedidos.</p>
          <p className="m">Lo que sí puedes hacer: pedir un permiso de área a la cuenta maestra desde Solicitudes de acceso.</p>
          <Link className="btn" to="/access-center" style={{ alignSelf: "flex-start" }}>Solicitudes de acceso {I(ChevronRight, 16)}</Link>
        </div>
      </section>
    </div>
  )
}
