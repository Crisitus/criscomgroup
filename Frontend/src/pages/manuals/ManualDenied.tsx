import { LayoutDashboard, Lock } from "lucide-react"
import { Link } from "react-router-dom"

/** 403 de la ruta (rol 4, cliente ecommerce): explicación y salida, no una redirección muda. */
export function ManualDenied() {
  return (
    <>
      <div className="ph"><h1>Manual de mi perfil</h1></div>
      <section className="card err" role="alert">
        <span className="sbadge"><Lock className="ic" size={16} strokeWidth={1.75} aria-hidden="true" /><span>Error 403 · Sin acceso</span></span>
        <h2>Tu cuenta de cliente no tiene manual del ERP</h2>
        <p>Esta pantalla es del personal de Criscom Group. Las cuentas de cliente de la tienda no tienen acceso al ERP: tu cuenta funciona bien, simplemente esta pantalla no es para ese perfil.</p>
        <p>Puedes volver al Dashboard.</p>
        <div className="acts">
          <Link className="btn pri" to="/">
            <LayoutDashboard className="ic" size={18} strokeWidth={1.75} aria-hidden="true" /><span>Ir al Dashboard</span>
          </Link>
        </div>
      </section>
    </>
  )
}
