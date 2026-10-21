import type { LucideIcon } from "lucide-react"
import { Check, Download, FileText, KeyRound, LogIn, Pencil, Plus, RefreshCw, Repeat, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react"
import type { AuditLogRow } from "../../services/auditLogService"
import { DASH, MOTIVO, hist, lAcc } from "./audCommon"

export const I = (Icon: LucideIcon, size = 16, cls = "") => <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />
export const Spin = () => I(RefreshCw, 16, "spin")

const ICONO: Record<string, LucideIcon> = {
  crear: Plus, actualizar: Pencil, eliminar: Trash2, login: LogIn, exportar: Download, convertir: Repeat, cambiar_estado: RefreshCw,
  solicitar_acceso: KeyRound, resolver_solicitud_acceso: ShieldCheck, configurar_superusuario_temporal: ShieldAlert, purgar: Trash2, purgar_total: Trash2,
}

/** Accion: icono + palabra (nunca solo color). */
export const ActChip = ({ a }: { a: string }) => <span className="ac">{I(ICONO[a] ?? FileText, 14)}<span>{lAcc(a)}</span></span>

/** Estado HTTP; las filas historicas no lo tienen: "-" con el motivo accesible. */
export const HttpPill = ({ r }: { r: AuditLogRow }) => hist(r)
  ? <span className="mut" aria-label={`Estado HTTP no registrado: ${MOTIVO}`} title={MOTIVO}>{DASH}</span>
  : <span className="st ok">{I(Check, 12)}{r.estado_http}</span>
