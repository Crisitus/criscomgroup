import { LogIn, LogOut } from "lucide-react"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import { LOGIN_URL, LOGOUT_CONS } from "./maeCommon"
import { I } from "./maeParts"

/** Cambiar la contrasena cierra todas las sesiones (token_version): se avisa antes de enviar. */
export function MaeLogoutDialog({ onBack, onOk }: { onBack: () => void; onOk: () => void }) {
  return (
    <ErpDialog open onOpenChange={o => { if (!o) onBack() }} title="¿Cambiar la contraseña y cerrar sesión?" icon={I(LogOut, 22)}>
      <div className="pg-maestra dlgw">
        <p className="cons">{LOGOUT_CONS}</p>
        <div className="acts">
          <button type="button" className="btn out" onClick={onBack}>Volver</button>
          <button type="button" className="btn" onClick={onOk}>Cambiar y cerrar sesión</button>
        </div>
      </div>
    </ErpDialog>
  )
}

/** 401 (SESSION_REVOKED): la sesion ya no vale; un unico boton. */
export function MaeSessionDialog() {
  return (
    <ErpDialog open onOpenChange={() => {}} title="Tu sesión terminó" icon={I(LogIn, 22)}>
      <div className="pg-maestra dlgw">
        <p>Vuelve a iniciar sesión.</p>
        <div className="acts"><button type="button" className="btn" onClick={() => window.location.assign(LOGIN_URL)}>{I(LogIn, 16)}Iniciar sesión</button></div>
      </div>
    </ErpDialog>
  )
}
