import { ArrowDownToLine, CircleCheck, CircleX, Clock, PackageCheck, TriangleAlert, type LucideIcon } from "lucide-react"
import type { Acquisition } from "../../services/acquisitionService"
import { longDate, money } from "../../components/erp/format"

export const SEP = " \u00b7 "
export const DASH = "\u2014"
export const ELL = "\u2026"
export const ARROW = "\u2192"
export const Q = (s: string) => `\u00ab${s}\u00bb`
export const I = (Icon: LucideIcon, size = 18, cls = "") => <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />

export type Prueba = Acquisition["prueba_funcional"]
export const PRUEBA: Record<Prueba, [string, LucideIcon, string]> = {
  aprobado: ["Aprobado", CircleCheck, "ok"], observado: ["Observado", TriangleAlert, "warn"],
  rechazado: ["Rechazado", CircleX, "bad"], pendiente: ["Pendiente", Clock, "neu"],
}
export const PRUEBAS: Prueba[] = ["pendiente", "aprobado", "observado", "rechazado"]
export const TIPO: Record<string, string> = { compra: "Compra", donacion_real: "Donación", cesion_gratuita: "Cesión gratuita" }
export const DOCS = ["DNI", "RUC", "CE"]
export const COMP: Record<string, string> = {
  equipo_completo: "Equipo completo", ssd: "SSD", hdd: "HDD", bateria: "Batería", ram: "RAM", gpu: "GPU", cpu: "CPU", placa_madre: "Placa madre", otro: "Otro",
}

export const okTest = (a: Pick<Acquisition, "prueba_funcional">) => a.prueba_funcional === "aprobado" || a.prueba_funcional === "observado"
export const enStock = (a: Acquisition) => !!a.inventario_registrado_en
type Stk = { k: string; i: LucideIcon; t: string }
export function stk(a: Acquisition): Stk {
  if (enStock(a)) return { k: "ok", i: PackageCheck, t: "En stock" }
  if (okTest(a)) return { k: "inf", i: ArrowDownToLine, t: "Listo para ingresar" }
  if (a.prueba_funcional === "rechazado") return { k: "bad", i: CircleX, t: "No ingresa" }
  return { k: "neu", i: Clock, t: "Pendiente de prueba" }
}
export const StkChip = ({ a, s = 14 }: { a: Acquisition; s?: number }) => { const k = stk(a); return <span className={`st ${k.k}`}>{I(k.i, s)}{k.t}</span> }
export const PruebaChip = ({ p, s = 16 }: { p: Prueba; s?: number }) => { const x = PRUEBA[p]; return <span className={`st ${x[2]}`}>{I(x[1], s)}{x[0]}</span> }

export type Filter = "todos" | "pend" | "listo" | "stock" | "rech"
export const FILTERS: [Filter, string, (a: Acquisition) => boolean][] = [
  ["todos", "Todos", () => true],
  ["pend", "Pendiente de prueba", a => a.prueba_funcional === "pendiente"],
  ["listo", "Listos para ingresar", a => !enStock(a) && okTest(a)],
  ["stock", "En stock", a => enStock(a)],
  ["rech", "Rechazados", a => a.prueba_funcional === "rechazado"],
]

const nf = (d: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })
export const num = (n: unknown, d = 0) => nf(d).format(Number(n) || 0)
export const sol = (n: unknown) => money(Number(n) || 0)
export const gl = (g?: string | null) => (g === "defectuoso" ? "Defectuoso" : g || "")
export const clean = (s?: string | null) => (s ? s.replace(/^seed-inventario\.\s*/, "") : s)
export const cap = (s?: string | null) => (s ? s[0].toUpperCase() + s.slice(1) : s)
export const fd = (ts?: string | null) => (ts ? longDate(ts.slice(0, 10)) : DASH)
/** Fechas del backend ya en hora de Lima. */
export const ft = (ts?: string | null) => {
  if (!ts) return DASH
  const h = Number(ts.slice(11, 13))
  return `${fd(ts)}, ${h % 12 || 12}:${ts.slice(14, 16)} ${h < 12 ? "a. m." : "p. m."}`
}
export const errMsg = (e: unknown, fb: string) => (e as { response?: { data?: { message?: string } } }).response?.data?.message || (e as Error)?.message || fb

/** Métricas registradas, como pares etiqueta / valor. */
export function mets(a: Partial<Record<string, unknown>>): [string, React.ReactNode][] {
  const has = (k: string) => a[k] != null && a[k] !== ""
  const m: [string, React.ReactNode][] = []
  if (has("smart_salud_porcentaje")) m.push(["Salud SMART", `${num(a.smart_salud_porcentaje, 2)} %`])
  if (has("tbw_escrito") && has("tbw_nominal") && Number(a.tbw_nominal) > 0) m.push(["TBW escrito / nominal", `${num(a.tbw_escrito, 2)} / ${num(a.tbw_nominal, 2)} (desgaste ${Math.round((Number(a.tbw_escrito) / Number(a.tbw_nominal)) * 100)} %)`])
  if (has("horas_encendido")) m.push(["Horas de encendido", num(a.horas_encendido)])
  if (has("ciclos_encendido")) m.push(["Ciclos de encendido", num(a.ciclos_encendido)])
  if (has("ciclos_bateria")) m.push(["Ciclos de batería", num(a.ciclos_bateria)])
  if (has("capacidad_bateria_actual") && Number(a.capacidad_bateria_diseno) > 0) m.push(["Batería actual / diseño", `${num(a.capacidad_bateria_actual)} / ${num(a.capacidad_bateria_diseno)} (${Math.round((Number(a.capacidad_bateria_actual) / Number(a.capacidad_bateria_diseno)) * 100)} %)`])
  return m
}

export type Evaluacion = { score: number; grade: string; alerts: string[] }
export function Grade({ d }: { d: Evaluacion }) {
  return (
    <div className="gr">
      <div className={`gb${d.grade.length > 1 ? " w" : ""}`} role="img" aria-label={`Grado ${gl(d.grade)}`}>{gl(d.grade)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="gs">{num(d.score, 2)} <small>/ 100</small></div>
        <div className="bar" role="img" aria-label={`Puntaje ${num(d.score, 2)} de 100`}><i style={{ width: `${d.score}%` }} /></div>
      </div>
    </div>
  )
}
export const Alerts = ({ d }: { d: Evaluacion }) => d.alerts.length
  ? <ul className="ck">{d.alerts.map(x => <li key={x}>{I(TriangleAlert)}<span>{x}</span></li>)}</ul>
  : <span className="st ok">{I(CircleCheck, 16)}Sin alertas</span>
