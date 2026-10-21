import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { AlertTriangle, CheckCircle2, Info, RefreshCw, XCircle } from "lucide-react"
import type { Tono } from "./usrCommon"

export const I = (Icon: LucideIcon, size = 16, cls = "") => <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />
export const Spin = () => I(RefreshCw, 16, "spin")

export const Chip = ({ t, icon, x, lg }: { t: Tono; icon: LucideIcon; x: string; lg?: boolean }) => (
  <span className={`ch ${t}${lg ? " lg" : ""}`}>{I(icon, lg ? 15 : 13)}<span>{x}</span></span>
)

/** Motivo escrito junto a un control (nunca solo en un tooltip). */
export const Why = ({ id, children, icon = Info }: { id?: string; children: ReactNode; icon?: LucideIcon }) => (
  <p className="why" id={id}>{I(icon, 14)}<span>{children}</span></p>
)

export interface Banner { tone: "er" | "wn" | "ok"; title: string; text?: string; items?: string[] }
const ICONS = { er: XCircle, wn: AlertTriangle, ok: CheckCircle2 }

export function Alert({ b, children, onClose }: { b: Banner; children?: ReactNode; onClose?: () => void }) {
  return (
    <div className={`al ${b.tone}`} role={b.tone === "ok" ? "status" : "alert"}>
      {I(ICONS[b.tone], 18)}
      <div>
        <b>{b.title}</b>
        {b.text && <p>{b.text}</p>}
        {b.items && <ul>{b.items.map(x => <li key={x}>{x}</li>)}</ul>}
        {(children || onClose) && (
          <div className="acts">{children}{onClose && <button type="button" className="btn out" onClick={onClose}>Entendido</button>}</div>
        )}
      </div>
    </div>
  )
}

/** Confirmación inline (nunca modal): dice la consecuencia exacta. */
export function Confirm({ title, text, ok, okLabel, busy, onOk, onCancel, danger = true }: {
  title: string; text: ReactNode; ok?: boolean; okLabel: string; busy?: boolean; onOk: () => void; onCancel: () => void; danger?: boolean; }) {
  return (
    <div className="al wn" role="alertdialog" aria-label={title}>
      {I(AlertTriangle, 18)}
      <div>
        <b>{title}</b>
        <p>{text}</p>
        <div className="acts">
          <button type="button" className="btn out" onClick={onCancel}>Cancelar</button>
          <button type="button" className={`btn ${danger ? "dng" : "pri"}`} aria-disabled={busy || ok === false} onClick={() => { if (!busy && ok !== false) onOk() }}>
            {busy && <Spin />}{okLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Estado de panel completo: vacío, error 500, 403, sesión vencida. */
export function Msg({ icon, title, children, action, tone }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode; tone?: "er" | "wn" }) {
  return (
    <div className={`em${tone ? ` ${tone}` : ""}`} role={tone ? "alert" : "status"}>
      <span className="ei">{I(icon, 22)}</span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export const Skeleton = ({ rows = 8 }: { rows?: number }) => (
  <div aria-busy="true" aria-label="Cargando">
    {Array.from({ length: rows }, (_, i) => <div className="skr" key={i}><div className="sk" style={{ width: `${40 + (i * 13) % 35}%` }} /><div className="sk" style={{ width: `${55 + (i * 7) % 30}%`, height: 10 }} /></div>)}
  </div>
)

/** Campo con etiqueta, ayuda y error propio (aria-describedby). */
export function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label className="lab2" htmlFor={id}>{label}</label>
      {children}
      {error && <p className="fe" id={`${id}-e`}>{I(XCircle, 14)}<span>{error}</span></p>}
      {hint && !error && <p className="hint" id={`${id}-h`} style={{ marginTop: 6 }}>{hint}</p>}
    </div>
  )
}

export interface SegOpt<T extends string> { v: T; x: string; off?: string }
/** Grupo de opciones con radiogroup; las deshabilitadas llevan su motivo escrito debajo. */
export function Seg<T extends string>({ label, value, opts, onPick, w100 }: { label: string; value: T | ""; opts: SegOpt<T>[]; onPick: (v: T) => void; w100?: boolean }) {
  return (
    <div className={`seg${w100 ? " w100" : ""}`} role="radiogroup" aria-label={label}>
      {opts.map(o => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} aria-disabled={!!o.off} onClick={() => { if (!o.off) onPick(o.v) }}>{o.x}</button>
      ))}
    </div>
  )
}

export interface Guard { text: string; onKeep: () => void; onDiscard: () => void }
export const GuardAlert = ({ g }: { g: Guard }) => (
  <div className="sec" style={{ paddingTop: 0, borderTop: 0 }}>
    <Alert b={{ tone: "wn", title: "Tienes cambios sin guardar", text: g.text }}>
      <button type="button" className="btn pri" onClick={g.onKeep}>Seguir editando</button>
      <button type="button" className="btn out" onClick={g.onDiscard}>Descartar cambios</button>
    </Alert>
  </div>
)
