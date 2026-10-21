import { CircleAlert, CircleCheck, CircleX, FlaskConical, Loader, TriangleAlert } from "lucide-react"
import { I, type MailFlags } from "./comShared"
import type { Status } from "./useComData"

export function ModeStrip({ flags, status }: { flags: MailFlags | null; status: Status }) {
  if (!flags && status === "load") {
    return (
      <div className="mode" style={{ ["--c" as string]: "var(--nav-fg-2)" }} role="status" aria-busy="true">
        <span className="bd">{I(Loader, 16, "spin")}Comprobando…</span>
        <span className="tx">Leyendo el modo de correo. No envíes nada hasta que aparezca.</span>
      </div>
    )
  }
  if (!flags) {
    return (
      <div className="mode live" role="status">
        <span className="bd">{I(CircleAlert, 16)}Modo desconocido</span>
        <span className="tx">No se pudo leer el modo de correo: no envíes hasta recargar.</span>
      </div>
    )
  }
  const live = flags.mail_mode === "live"
  const smtpCls = flags.smtp_configured ? "yes" : live ? "no" : ""
  return (
    <div className={`mode${live ? " live" : ""}`} role="status">
      <span className="bd">{I(live ? TriangleAlert : FlaskConical, 16)}{live ? "Envío real" : "Simulación"}<code>{flags.mail_mode}</code></span>
      <span className="tx">{live ? "Envío real por SMTP." : "Ningún correo sale del servidor."}</span>
      <span className="tg">
        <span className={smtpCls}>{I(flags.smtp_configured ? CircleCheck : CircleX, 14)}SMTP: {flags.smtp_configured ? "configurado" : "no configurado"}</span>
        <span className={flags.public_base_url_configured ? "yes" : "no"}>{I(flags.public_base_url_configured ? CircleCheck : CircleX, 14)}URL pública: {flags.public_base_url_configured ? "configurada" : "no configurada"}</span>
      </span>
    </div>
  )
}
