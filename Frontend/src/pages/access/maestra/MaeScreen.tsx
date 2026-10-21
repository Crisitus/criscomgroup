import { useState } from "react"
import { CircleAlert, CircleCheck, RefreshCw, TriangleAlert } from "lucide-react"
import { Banner, I } from "./maeParts"
import { MaeDenied } from "./MaeDenied"
import { MaeLogoutDialog, MaeSessionDialog } from "./MaeDialogs"
import { MaeFicha } from "./MaeFicha"
import { MaePassword } from "./MaePassword"
import { MaePermisos } from "./MaePermisos"
import { useMaeForm } from "./useMaeForm"
import { useMaeGrants, type Notice } from "./useMaeGrants"

const LABELS: Record<string, [string, string]> = { name: ["Nombre", "mae-nombre"], current_password: ["Contraseña actual", "mae-actual"], new_password: ["Nueva contraseña", "mae-nueva"] }

/** Cuenta maestra: ficha, contrasena y permisos de area en una sola pantalla. */
export function MaeScreen({ logout, mob }: { logout: () => void; mob: boolean }) {
  const [notice, setNotice] = useState<Notice>(null)
  const f = useMaeForm(true, logout, setNotice)
  const gr = useMaeGrants(f.status !== "403", setNotice)
  if (f.status === "403") return <MaeDenied />
  const keys = Object.keys(f.errors).filter(k => LABELS[k])
  const goto = (id: string) => (e: React.MouseEvent) => { e.preventDefault(); document.getElementById(id)?.focus() }
  return (
    <div className="pg">
      <div className="ph"><h1>Cuenta maestra</h1><p>Tu cuenta, tu contraseña y los permisos de área que has concedido.</p></div>
      {notice && <Banner tone={notice.tone} icon={I(notice.tone === "ok" ? CircleCheck : TriangleAlert, 20)} title={notice.title} sm={notice.sm} />}
      {f.status === "err" && (
        <Banner tone="bad" icon={I(TriangleAlert, 20)} title="No se pudo cargar la cuenta maestra" sm="Reintenta para poder editar tu nombre y cambiar la contraseña."
          extra={<button type="button" className="btn out" style={{ marginLeft: "auto" }} onClick={() => void f.load()}>{I(RefreshCw, 16)}Reintentar</button>} />
      )}
      {keys.length > 0 && (
        <div className="sum" role="alert">
          <span className="tt">{I(CircleAlert, 18)}{keys.length === 1 ? "Hay 1 campo por corregir" : `Hay ${keys.length} campos por corregir`}</span>
          <ul>{keys.map(k => <li key={k}><a className="lk" href={`#${LABELS[k][1]}`} onClick={goto(LABELS[k][1])}>{LABELS[k][0]}</a></li>)}</ul>
        </div>
      )}
      <MaeFicha f={f} />
      <div className="cols">
        <MaePassword f={f} />
        <MaePermisos gr={gr} mob={mob} />
      </div>
      {f.confirm && <MaeLogoutDialog onBack={() => f.setConfirm(false)} onOk={() => void f.save()} />}
      {f.expired && <MaeSessionDialog />}
    </div>
  )
}
