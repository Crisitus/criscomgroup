import { useState } from "react"
import { ArrowDownToLine, CircleAlert, CircleX, Clock, PackageCheck } from "lucide-react"
import type { Acquisition } from "../../services/acquisitionService"
import { Alerts, COMP, DASH, Grade, I, PruebaChip, SEP, StkChip, TIPO, cap, clean, enStock, fd, ft, gl, mets, num, okTest, sol } from "./acqShared"

type Tab = "ev" | "eq" | "tr" | "op"
const TABS: [Tab, string][] = [["ev", "Evaluación"], ["eq", "Equipo"], ["tr", "Transferente"], ["op", "Operación"]]
const dd = (l: string, v: React.ReactNode, full = false) => <div className={full ? "full" : undefined}><dt>{l}</dt><dd>{v == null || v === "" ? <span className="mut">{DASH}</span> : v}</dd></div>

function TabEv({ a }: { a: Acquisition }) {
  const d = a.evaluacion_detalle
  if (!d) return <div className="pn"><div className="inl"><span className="st neu">{I(Clock, 16)}Sin evaluación</span><span className="hint">No hay métricas registradas. Estado de recepción: {a.estado_recepcion}.</span></div></div>
  const m: [string, React.ReactNode][] = [["Prueba funcional", <PruebaChip p={a.prueba_funcional} s={14} />], ...mets(a as unknown as Record<string, unknown>)]
  return (
    <div className="pn">
      <Grade d={d} />
      <div><div className="sh">Alertas <small>{d.alerts.length}</small></div><Alerts d={d} /></div>
      <div><div className="sh">Métricas</div>{m.map(([l, v]) => <div className="kv" key={l}><span>{l}</span><span className="num">{v}</span></div>)}</div>
    </div>
  )
}
const TabEq = ({ a }: { a: Acquisition }) => <dl className="dl">{dd("Marca", a.marca)}{dd("Modelo", a.modelo)}{dd("Número de serie", a.numero_serie)}{dd("Tipo de componente", COMP[a.tipo_componente])}{dd("Capacidad", a.capacidad)}{dd("Accesorios", a.accesorios)}{dd("Estado de recepción", a.estado_recepcion, true)}{dd("Observaciones técnicas", clean(a.observaciones_tecnicas), true)}</dl>
const TabTr = ({ a }: { a: Acquisition }) => <dl className="dl">{dd("Nombre o razón social", a.transferente_nombre, true)}{dd("Documento", `${a.transferente_tipo_documento} ${a.transferente_numero_documento}`)}{dd("Contacto", a.transferente_contacto)}</dl>
const TabOp = ({ a }: { a: Acquisition }) => <dl className="dl">{dd("Tipo de operación", TIPO[a.tipo_operacion])}{dd("Monto", <span className="num">{sol(a.monto_adquisicion)}</span>)}{dd("Medio de pago", cap(a.medio_pago))}{dd("Referencia de pago", a.referencia_pago)}{dd("Formulario 820", a.formulario_820)}{dd("Declaración no habitual", a.declaracion_no_habitual ? "Sí" : "No")}{dd("Declaración de propiedad", a.declaracion_propiedad ? "Sí" : "No")}{dd("Procedencia declarada", a.procedencia_declarada, true)}</dl>

export const INGRESAR = "Asignar producto e ingresar al stock"
/** Franja de inventario: estado, motivo y botón (el botón se devuelve aparte para el pie móvil). */
export function bandParts(a: Acquisition, onOpen: () => void) {
  const id = `dr-${a.id_adquisicion}`
  const lbl = a.producto_id ? "Ingresar al stock" : INGRESAR
  if (enStock(a)) {
    const p = a.producto
    return { left: <><span className="st ok">{I(PackageCheck, 16)}Ingresado al stock</span><span>{ft(a.inventario_registrado_en)}{p && <>{SEP}<b>{p.nombre}</b>{SEP}SKU {p.sku}{SEP}stock actual {p.stock}</>}</span><span>Ya ingresado: el producto, el monto, el tipo y la serie no cambian.</span></>, btn: null }
  }
  if (okTest(a)) return {
    left: <span>{a.producto ? <>Producto asignado: <b>{a.producto.nombre}</b>.</> : <b>Sin producto asignado.</b>} Al ingresar se suma 1 unidad al stock con costo {sol(a.monto_adquisicion)}.</span>,
    btn: <button type="button" className="btn bnb" onClick={onOpen}>{I(ArrowDownToLine)}{lbl}</button>,
  }
  const bad = a.prueba_funcional === "rechazado"
  const obs = clean(a.observaciones_tecnicas)?.replace(/\.$/, "")
  const why = bad ? `No ingresa al stock: la prueba funcional fue Rechazada${obs ? ` (${obs})` : ""}.` : "Aún no se puede ingresar: la prueba funcional está Pendiente y debe quedar Aprobada u Observada."
  return {
    left: <span className={`why${bad ? " bad" : ""}`} id={id}>{I(bad ? CircleX : CircleAlert, 16)}<span>{why}</span></span>,
    btn: <button type="button" className="btn bnb" aria-disabled="true" aria-describedby={id}>{I(ArrowDownToLine)}{lbl}</button>,
  }
}

export function AcqDetail({ a, mob, onOpen }: { a: Acquisition; mob: boolean; onOpen: () => void }) {
  const [tab, setTab] = useState<Tab>("ev")
  const bp = bandParts(a, onOpen)
  const ev = a.grado_evaluacion ? `${gl(a.grado_evaluacion)}${SEP}${num(a.puntaje_evaluacion, 2)}` : "Sin evaluar"
  const name = [a.marca, a.modelo].filter(Boolean).join(" ") || COMP[a.tipo_componente]
  return (
    <section className="card ex" aria-label={`Expediente ${a.id_adquisicion}`} style={mob ? { flex: 1 } : undefined}>
      <div className="exh">
        <div className="r1"><h2>{name}</h2><span><span className="mut">Prueba</span> <PruebaChip p={a.prueba_funcional} /></span><StkChip a={a} s={16} /></div>
        <div className="r2">Expediente #{a.id_adquisicion}{SEP}{COMP[a.tipo_componente]}{SEP}{TIPO[a.tipo_operacion]}{SEP}Serie {a.numero_serie}</div>
      </div>
      <div className="mny">
        <div><div className="l">Monto de adquisición</div><div className="v big num">{sol(a.monto_adquisicion)}</div></div>
        <div><div className="l">Evaluación técnica</div><div className="v num">{ev}</div></div>
        <div><div className="l">Recibido</div><div className="v num">{fd(a.fecha_adquisicion)}</div></div>
      </div>
      <div className="band"><div className="bl">{bp.left}</div>{!mob && bp.btn}</div>
      <div className="tabs" role="tablist" aria-label="Secciones del expediente">
        {TABS.map(([k, l]) => <button type="button" key={k} className="tab" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      <div className="exb" role="tabpanel">{tab === "ev" ? <TabEv a={a} /> : tab === "eq" ? <TabEq a={a} /> : tab === "tr" ? <TabTr a={a} /> : <TabOp a={a} />}</div>
    </section>
  )
}
