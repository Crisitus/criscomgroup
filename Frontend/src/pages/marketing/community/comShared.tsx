import type { LucideIcon } from "lucide-react"
import { CircleCheck, CircleX, FileText, Loader, TriangleAlert } from "lucide-react"
import type { CampaignState, CommunityCampaign } from "../../../services/communityService"

export const SEP = " · "
export const DASH = "—"
export const ELL = "…"
export const EN = "–"
export const Q = (s: string) => `«${s}»`
export const MAX_SUBJECT = 180
export const DEFAULT_BODY = "Hola {{nombre}},\n\n"

export const I = (Icon: LucideIcon, size = 16, cls = "") => <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />

const DT = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/
/** Fechas del backend ya en hora de Lima: no se resta nada. */
export const fd = (s?: string | null) => (s ? s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(0, 4) : DASH)
export const ft = (s?: string | null) => {
  const m = s ? DT.exec(s) : null
  if (!m) return DASH
  const h = Number(m[4])
  return `${h % 12 || 12}:${m[5]} ${h < 12 ? "a. m." : "p. m."}`
}
export const fdt = (s?: string | null) => (s ? `${fd(s)} ${ft(s)}` : DASH)

export const errMsg = (e: unknown, fb: string) => {
  const d = (e as { response?: { data?: { message?: string; msg?: string } } }).response?.data
  return d?.message || d?.msg || fb
}
export const errStatus = (e: unknown) => (e as { response?: { status?: number } }).response?.status

export const EST: Record<CampaignState, { tone: string; icon: LucideIcon; label: string }> = {
  borrador: { tone: "neu", icon: FileText, label: "Borrador" },
  enviando: { tone: "neu", icon: Loader, label: "Enviando" },
  enviado: { tone: "ok", icon: CircleCheck, label: "Enviado" },
  parcial: { tone: "warn", icon: TriangleAlert, label: "Parcial" },
  fallido: { tone: "bad", icon: CircleX, label: "Fallido" },
}
export function StateChip({ estado }: { estado: CampaignState }) {
  const e = EST[estado]
  return <span className={`st ${e.tone}`}>{I(e.icon, 14, estado === "enviando" ? "spin" : "")}{e.label}</span>
}

export const pending = (c: Pick<CommunityCampaign, "destinatarios" | "enviados" | "fallidos">) => Math.max(0, c.destinatarios - c.enviados - c.fallidos)

export interface MailFlags { mail_mode: "dry" | "test" | "live"; smtp_configured: boolean; public_base_url_configured: boolean }
/** Motivo por el que enviar / probar no es posible (null = se puede). */
export const blockReason = (m: MailFlags | null): string | null => {
  if (!m) return "Comprobando el modo de correo" + ELL
  if (!m.public_base_url_configured) return "Falta PUBLIC_BASE_URL: ningún envío es posible."
  if (m.mail_mode === "live" && !m.smtp_configured) return "Modo live sin SMTP completo: ningún envío es posible."
  return null
}
export const modeText = (mode: string) => (mode === "live" ? "Envío real (live)" : `Simulación (${mode}): ningún correo sale del servidor`)
export const renderName = (t: string, name: string) => t.replace(/\{\{nombre\}\}/g, name)
