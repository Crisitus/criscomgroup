import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  BrainCircuit, ChevronDown, ChevronRight, CircleCheck, ClipboardList, ClipboardPlus, Clock, Coins, Cpu,
  FileText, FlaskConical, Globe, Hourglass, Inbox, MessageCircle, PackageCheck, Plus, RefreshCw, Search,
  Ship, TriangleAlert, Wallet, Wrench, type LucideIcon,
} from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { listWorkOrders, type WorkOrder } from "../../services/workOrderService"
import { longDate, money, todayLima, weekdayOf } from "../../components/erp/format"
import "../../styles/taller-resumen.css"

const I = (Icon: LucideIcon, size = 16) => <Icon className="ic" size={size} strokeWidth={1.75} aria-hidden="true" />

const ESTADOS: Record<string, [string, LucideIcon]> = {
  recibido: ["Recibido", Inbox],
  diagnostico: ["En diagnóstico", Search],
  cotizado: ["Cotizado", FileText],
  aprobado: ["Aprobado", CircleCheck],
  en_proceso: ["En reparación", Wrench],
  pruebas: ["En pruebas", FlaskConical],
  listo: ["Listo para entregar", PackageCheck],
}
const FINAL = ["entregado", "cancelado"]
type Access = [string, string, string, LucideIcon]
const FLUJO: Access[] = [
  ["/services/intake", "1. Recibir equipo", "Crea el expediente con cliente, serie, estado físico, accesorios y consentimiento.", ClipboardPlus],
  ["/services/technical", "2. Gestionar órdenes", "Diagnóstico, cotización, repuestos, evidencias, pagos, entrega y garantía en un expediente.", ClipboardList],
  ["/services/diagnostics", "3. Diagnóstico asistido", "Registra mediciones y revisa hipótesis; la decisión final siempre queda en el técnico.", BrainCircuit],
  ["/services/whatsapp", "4. Informar al cliente", "Prepara actualizaciones con consentimiento y conserva trazabilidad de cada apertura.", MessageCircle],
]
const ADMIN: Access[] = [
  ["/services/cash", "Caja y ventas de servicio", "Separa mano de obra, repuestos, costos, cobros, anulaciones y saldos.", Coins],
  ["/services/expenses", "Gastos del taller", "Registra egresos y vincúlalos con la orden que los originó.", Wallet],
  ["/services/maintenance", "Mantenimientos", "Planes preventivos, correctivos, limpieza, optimización y checklist de tareas.", Wrench],
  ["/services/pc-builds", "Armado de PCs", "Flujo especializado de componentes, compatibilidad, pruebas y entrega.", Cpu],
]
const EXT: Access = ["/services/web-requests", "Solicitudes desde la página", "Contacta y convierte una solicitud pública en orden sin volver a escribir los datos.", Globe]
const IMP: Access = ["/imports", "Importaciones relacionadas", "Abre el expediente privado cuando una reparación necesita componentes del extranjero.", Ship]
const REGLA = "Una orden solo se entrega con pago completo, venta contable creada, clasificación fiscal y repuestos conciliados."
const ROUTE: Record<string, string> = { servicio_tecnico: "/services/technical", mantenimiento: "/services/maintenance", armado_pc: "/services/pc-builds" }

const day = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5
const dmy = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`
const monto = (o: WorkOrder) => Number(o.costo_repuestos) + Number(o.costo_mano_obra) + Number(o.recargo || 0) - Number(o.descuento || 0)
const saldo = (o: WorkOrder) => Math.max(0, monto(o) - Number(o.adelanto || 0))
const pl = (n: number, u: string) => `${n} ${u}${n === 1 ? "" : "s"}`

type Row = { o: WorkOrder; r: number; m: { c: "bad" | "warn" | "neu"; Icon: LucideIcon; t: string } }

function derive(list: WorkOrder[], hoyStr: string) {
  const act = list.filter(o => !FINAL.includes(o.estado))
  const K = {
    activas: act.length,
    listas: list.filter(o => o.estado === "listo").length,
    listasSaldo: list.filter(o => o.estado === "listo" && saldo(o) > 0).length,
    saldo: list.reduce((t, o) => t + saldo(o), 0),
    comp: list.filter(o => o.estado_facturacion === "pendiente_emision").length,
  }
  const hoy = day(hoyStr)
  const rows: Row[] = []
  act.forEach(o => {
    const ingreso = String(o.fecha_ingreso).slice(0, 10)
    const entrega = o.fecha_entrega_estimada ? String(o.fecha_entrega_estimada).slice(0, 10) : ""
    const d = entrega ? day(entrega) - hoy : null
    const age = hoy - day(ingreso)
    const s = saldo(o)
    const sal = s > 0 ? ` . saldo ${money(s)}` : ""
    let row: Row | null = null
    if (d !== null && d < 0) row = { o, r: 0, m: { c: "bad", Icon: Clock, t: `Vencida hace ${pl(-d, "día")}${sal}` } }
    else if (o.estado === "listo" && s > 0) row = { o, r: 1, m: { c: "warn", Icon: TriangleAlert, t: `Lista con saldo ${money(s)}` } }
    else if (d === 0) row = { o, r: 2, m: { c: "warn", Icon: Clock, t: `Entrega hoy${sal}` } }
    else if (o.estado === "cotizado") row = { o, r: 3, m: { c: "warn", Icon: Hourglass, t: `Sin respuesta . ingresó hace ${pl(age, "día")}` } }
    else if (o.estado === "recibido") row = { o, r: 4, m: { c: "neu", Icon: Inbox, t: `Sin diagnóstico . ingresó ${age === 1 ? "ayer" : age === 0 ? "hoy" : `hace ${pl(age, "día")}`}` } }
    else if (d === 1) row = { o, r: 5, m: { c: "neu", Icon: Clock, t: `Entrega mañana ${dmy(entrega)}${sal}` } }
    if (row) rows.push(row)
  })
  rows.sort((a, b) => a.r - b.r || day((a.o.fecha_entrega_estimada || "9999-12-31").slice(0, 10)) - day((b.o.fecha_entrega_estimada || "9999-12-31").slice(0, 10)))
  const pipe = Object.keys(ESTADOS).map(k => ({ k, n: list.filter(o => o.estado === k).length }))
  return { K, rows: rows.slice(0, 6), pipe, total: act.length }
}

const Sk = ({ w, h, mb }: { w: string; h: number; mb?: number }) => <span className="sk" style={{ width: w, height: h, marginBottom: mb }} />

function Cell({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <Link className="cell" to="/services/technical">
      <span className="r1"><span>{label}</span><span className="go"><b>Ver</b>{I(ChevronRight, 14)}</span></span>
      <span className="v num">{value}</span>
      <span className="s">{sub}</span>
    </Link>
  )
}

function AccessRow({ a, tag }: { a: Access; tag?: string }) {
  const [to, nm, ds, Icon] = a
  return (
    <Link className="ac" to={to} aria-label={nm}>
      {I(Icon, 20)}
      <span className="tx"><span className="nm">{nm}{tag && <span className="tag">{tag}</span>}</span><span className="ds">{ds}</span></span>
      <ChevronRight className="ic ar" size={16} strokeWidth={1.75} aria-hidden="true" />
    </Link>
  )
}

export default function ServiceAreaPage() {
  useDocumentTitle("Resumen del taller")
  const { user } = useAuth()
  const isMaster = user?.email?.trim().toLowerCase() === "cristophercalioro@gmail.com"
  const isAffiliate = Boolean(user?.affiliate_business_id)
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [status, setStatus] = useState<"load" | "ok" | "error">("load")
  const [narrow, setNarrow] = useState(() => window.innerWidth < 640)

  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 640)
    window.addEventListener("resize", on)
    return () => window.removeEventListener("resize", on)
  }, [])

  const load = useCallback(() => {
    setStatus("load")
    Promise.all([listWorkOrders("servicio_tecnico"), listWorkOrders("mantenimiento"), listWorkOrders("armado_pc")])
      .then(([technical, maintenance, builds]) => { setOrders([...technical, ...maintenance, ...builds]); setStatus("ok") })
      .catch(() => setStatus("error"))
  }, [])
  useEffect(() => { load() }, [load])

  const hoy = todayLima()
  const D = useMemo(() => derive(orders, hoy), [orders, hoy])
  const loading = status === "load"
  const failed = status === "error"
  const empty = status === "ok" && orders.length === 0

  const nuevo = <Link className="btn" to="/services/intake">{I(Plus, 18)}Nuevo ingreso</Link>
  const group2 = [...ADMIN.map(a => <AccessRow key={a[0]} a={a} />), ...(isMaster ? [<AccessRow key={IMP[0]} a={IMP} tag="Solo maestro" />] : [])]
  const v = (x: string | number) => (failed ? "-" : x)

  return (
    <div className="pg-tres">
      <main className="pg">
        <div className="hd">
          <h1>Resumen del taller</h1>
          <span className="dt">{weekdayOf(hoy).toLowerCase()} {longDate(hoy)}</span>
          {!narrow && !empty && nuevo}
        </div>

        {loading ? (
          <div className="strip" aria-busy="true">
            {[0, 1, 2, 3].map(k => (
              <div className="cell" key={k}><Sk w="55%" h={14} /><Sk w="38%" h={24} mb={4} /><Sk w="70%" h={12} /></div>
            ))}
          </div>
        ) : (
          <nav className="strip" aria-label="Indicadores del taller">
            <Cell label="Órdenes activas" value={v(D.K.activas)} sub={failed ? "Sin datos" : "Sin entregadas ni canceladas"} />
            <Cell label="Listas para entrega" value={v(D.K.listas)} sub={failed ? "Sin datos" : D.K.listasSaldo ? `${D.K.listasSaldo} con saldo pendiente` : "Sin saldo pendiente"} />
            <Cell label="Saldo por cobrar" value={v(money(D.K.saldo))} sub={failed ? "Sin datos" : "Incluye órdenes canceladas"} />
            <Cell label="Comprobantes pendientes" value={v(D.K.comp)} sub={failed ? "Sin datos" : "Pendientes de emisión"} />
          </nav>
        )}

        {failed ? (
          <section className="card" role="alert">
            <div className="ms er">
              <span className="ib">{I(TriangleAlert, 22)}</span>
              <h2>No se pudieron cargar las órdenes</h2>
              <p>Los indicadores no se muestran para no engañarte con ceros. Revisa tu conexión e inténtalo de nuevo.</p>
              <button type="button" className="btn out" onClick={load}>{I(RefreshCw, 18)}Reintentar</button>
            </div>
          </section>
        ) : empty ? (
          <section className="card">
            <div className="ms">
              <span className="ib">{I(ClipboardPlus, 22)}</span>
              <h2>Aún no hay órdenes en el taller</h2>
              <p>Registra el primer equipo para ver aquí qué órdenes necesitan acción, el pipeline por estado y los saldos por cobrar.</p>
              {nuevo}
            </div>
          </section>
        ) : (
          <div className="gm">
            <section className="card lst" aria-labelledby="h-act" aria-busy={loading}>
              <div className="ch">
                <h2 id="h-act">Requieren acción hoy</h2>
                {!loading && <span className="cnt num">{D.rows.length}</span>}
                {!loading && <Link className="lnk" to="/services/technical"><b>Ver las {D.total} activas</b>{I(ChevronRight, 16)}</Link>}
              </div>
              {loading
                ? [0, 1, 2, 3, 4, 5].map(k => <div className="or" key={k}><div><Sk w="60%" h={14} mb={6} /><Sk w="40%" h={12} /></div><div><Sk w="80%" h={12} mb={6} /><Sk w="50%" h={12} /></div><span /></div>)
                : D.rows.length === 0
                  ? <div className="ms"><span className="ib">{I(CircleCheck, 22)}</span><h2>Nada urgente por ahora</h2><p>Ninguna orden activa está vencida, esperando respuesta ni lista con saldo.</p></div>
                  : D.rows.map(({ o, m }) => {
                    const [el, EI] = ESTADOS[o.estado] || [o.estado, Inbox]
                    return (
                      <Link className="or" key={o.id_orden_servicio} to={`${ROUTE[o.tipo] || "/services/technical"}?orden=${o.id_orden_servicio}`} aria-label={`Abrir ${o.codigo}`}>
                        <div className="lft"><div className="t1"><b>{o.codigo}</b> . {o.cliente}</div><div className="t2">{o.equipo}</div></div>
                        <div className="mo">
                          <span className={`st ${m.c}`}>{I(m.Icon, 14)}<span>{m.t}</span></span>
                          <span className="es">{I(EI, 14)}{el}</span>
                        </div>
                        <span className="ab" title="Abrir">{I(ChevronRight, 18)}</span>
                      </Link>
                    )
                  })}
            </section>

            <section className="card pipe" aria-labelledby="h-pipe">
              <div className="ch"><h2 id="h-pipe">Pipeline por estado</h2></div>
              <div className="pb">
                {loading ? (
                  <>
                    <span className="sk" style={{ height: 14 }} />
                    <div className="stg-g">{[1, 2, 3, 4, 5, 6].map(k => <span key={k} className="sk" style={{ height: 44, borderRadius: 8 }} />)}</div>
                  </>
                ) : (
                  <>
                    <div className="seg" role="img" aria-label={`Distribución de ${D.total} órdenes activas por estado`}>
                      {D.pipe.filter(p => p.n).map(p => <i key={p.k} style={{ flex: p.n }} />)}
                    </div>
                    <div className="stg-g">
                      {D.pipe.map((p, i) => (
                        <Link key={p.k} className={`stg${i === D.pipe.length - 1 ? " w" : ""}`} to="/services/technical">
                          <span>{ESTADOS[p.k][0]}</span><b className="num">{p.n}</b>{I(ChevronRight, 16)}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
                <p className="rule"><b>Regla de cierre.</b> {REGLA}</p>
              </div>
            </section>
          </div>
        )}

        <section className="card ag" aria-label="Accesos del taller">
          <div className="gr">
            <div className="gh">Flujo operativo</div>
            {FLUJO.map(a => <AccessRow key={a[0]} a={a} />)}
            {!isAffiliate && <AccessRow a={EXT} tag="Entrada externa" />}
          </div>
          {narrow ? (
            <details className="gr">
              <summary>Control y administración ({group2.length}){I(ChevronDown, 16)}</summary>
              {group2}
            </details>
          ) : (
            <div className="gr"><div className="gh">Control y administración</div>{group2}</div>
          )}
        </section>

        {narrow && <div style={{ height: 60 }} aria-hidden="true" />}
      </main>
      {narrow && !failed && !empty && <div className="bar"><div>{nuevo}</div></div>}
    </div>
  )
}
