import { useEffect, useState } from "react"
import { ArrowRight, CircleAlert, CircleX, Lock, PackageCheck, Pencil, Save, Trash2 } from "lucide-react"
import type { ImportRecord } from "../../services/importService"
import { COST_LABEL, COSTS, Chip, DASH, FLOW, I, NXT, ST, SEP, ft, fd, mon, sol, enSoles, tcOf, total, unit, uds } from "./importsShared"

export type DetailActions = {
  advance: () => void; receive: () => void; edit: () => void; cancel: () => void; remove: () => void
  saveEditables: (d: Record<string, string>) => Promise<void>; busy: boolean
}

function Stepper({ o }: { o: ImportRecord }) {
  if (o.estado === "cancelada") return null
  const i = FLOW.indexOf(o.estado)
  return (
    <div className="stp" role="list" aria-label="Avance del embarque">
      {FLOW.map((k, j) => (
        <div role="listitem" key={k} className={j < i ? "done" : j === i ? "cur" : ""} aria-current={j === i ? "step" : undefined}>
          <i /><span>{I(ST[k][1], 14)}{ST[k][0]}</span>
        </div>
      ))}
    </div>
  )
}

function CostTable({ o, lock }: { o: ImportRecord; lock: boolean }) {
  return <>
    <div className="sh">Costos desglosados{lock ? <small className="st neu" style={{ fontWeight: 500 }}>{I(Lock, 14)}Bloqueados</small> : <small>{o.moneda}</small>}</div>
    <table className="tbl">
      <thead><tr><th scope="col">Concepto</th><th scope="col" className="r">Monto ({o.moneda})</th></tr></thead>
      <tbody>
        {COSTS.map(k => <tr key={k}><td>{COST_LABEL[k]}</td><td className="r num">{mon(o.moneda, Number(o[k]) || 0)}</td></tr>)}
        <tr className="tot"><td>Total</td><td className="r num">{mon(o.moneda, total(o))}</td></tr>
      </tbody>
    </table>
  </>
}

const dt = (k: string, v: React.ReactNode, cls = "") => <div className={cls}><dt>{k}</dt><dd>{v}</dd></div>

function Datos({ o }: { o: ImportRecord }) {
  const stock = !o.producto ? "Sin producto asignado" : o.estado === "cancelada" ? "No ingresó" : `${o.producto.stock} \u2192 ${o.producto.stock + o.cantidad} al recibir`
  return <>
    <div className="sh">Datos del embarque</div>
    <dl className="dl">
      {dt("Stock del producto", <span className="num">{stock}</span>)}
      {dt("Tracking", <span className="num">{o.tracking || "Sin tracking"}</span>)}
      {dt("Régimen aduanero", o.regimen_aduanero || "Sin definir")}
      {dt("DAM / DUA", <span className="num">{o.dam_dua || "Sin asignar"}</span>)}
      {dt("Fecha de embarque", fd(o.fecha_embarque))}
      {dt("Llegada estimada", fd(o.fecha_llegada_estimada))}
      {dt("Notas contables", o.notas_contables || DASH, "full")}
    </dl>
  </>
}

function Editables({ o, a }: { o: ImportRecord; a: DetailActions }) {
  const init = () => ({ tracking: o.tracking || "", dam_dua: o.dam_dua || "", fecha_embarque: o.fecha_embarque || "", fecha_llegada_estimada: o.fecha_llegada_estimada || "", notas_contables: o.notas_contables || "" })
  const [f, setF] = useState(init)
  useEffect(() => { setF(init()) }, [o]) // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(f) !== JSON.stringify(init())
  const inp = (l: string, k: keyof typeof f, type = "text") => <label className="fld"><span>{l}</span><input className="in" type={type} value={f[k]} onChange={e => setF(c => ({ ...c, [k]: e.target.value }))} /></label>
  return <>
    <div className="sh">Datos editables</div>
    <div className="frm">
      {inp("Tracking", "tracking")}{inp("DAM / DUA", "dam_dua")}{inp("Fecha de embarque", "fecha_embarque", "date")}{inp("Llegada estimada", "fecha_llegada_estimada", "date")}
      <label className="fld full"><span>Notas contables</span><textarea className="ta" value={f.notas_contables} onChange={e => setF(c => ({ ...c, notas_contables: e.target.value }))} /></label>
    </div>
    <div className="ftsave"><button type="button" className="btn" aria-disabled={!dirty || a.busy} aria-describedby={`ed-${o.id_importacion}`} onClick={() => { if (dirty && !a.busy) void a.saveEditables(f) }}>{I(Save)}Guardar cambios</button></div>
    <span className="hint" id={`ed-${o.id_importacion}`}>{dirty ? "Hay cambios sin guardar." : "Sin cambios por guardar."}</span>
  </>
}

export function ImportDetail({ o, mob, a }: { o: ImportRecord; mob: boolean; a: DetailActions }) {
  const rec = o.estado === "recibida", can = o.estado === "cancelada", nx = NXT[o.estado], id = o.id_importacion
  const why = rec
    ? <span className="st ok">{I(PackageCheck)}Ingresó al stock el {ft(o.inventario_registrado_en)}{SEP}+{uds(o.cantidad)}</span>
    : can ? <span className="why neu">{I(Lock)}<span>Cancelada es definitiva: no se reabre.</span></span>
    : nx ? <span className="hint" id={`why-${id}`}>Marcar recibida se habilita cuando esté Liberada.</span> : null
  const primary = rec || can ? null : nx
    ? <><button type="button" className="btn" aria-disabled={a.busy} onClick={() => { if (!a.busy) a.advance() }}>{I(ArrowRight)}Pasar a {ST[nx][0]}</button>
      <button type="button" className="btn out" aria-disabled="true" aria-describedby={`why-${id}`}>{I(PackageCheck)}Marcar recibida</button></>
    : <button type="button" className="btn" onClick={a.receive}>{I(PackageCheck)}Marcar recibida</button>
  const sub = <>{o.producto ? `${o.producto.nombre} (${o.producto.sku})` : <span className="st warn">{I(CircleAlert, 14)}Sin producto asignado</span>}{SEP}{uds(o.cantidad)}{SEP}{o.proveedor}{SEP}{o.pais_origen}</>
  return (
    <article className="card ex" aria-label={`Expediente ${o.referencia}`}>
      <div className="exh">
        <div className="r1"><h2>{o.referencia}</h2><Chip e={o.estado} /></div>
        <div className="r2">{!o.producto && <>{o.descripcion}{SEP}</>}{sub}</div>
        <Stepper o={o} />
        <div className="ra">{!mob && primary}{why}</div>
        <div className="mny">
          <div><div className="l">Costo total ({o.moneda})</div><div className="v num">{mon(o.moneda, total(o))}</div></div>
          <div><div className="l">Costo en soles{o.moneda === "PEN" ? "" : `${SEP}TC ${tcOf(o)}`}</div><div className="v num">{sol(enSoles(o))}</div></div>
          <div><div className="l">Costo unitario puesto en almacén</div><div className="v big num">{sol(unit(o))} <small>por unidad</small></div></div>
        </div>
      </div>
      <div className="exb">
        {rec ? <>
          <section><CostTable o={o} lock /><div className="why neu" style={{ marginTop: 8 }}>{I(Lock)}<span>Bloqueados: producto, cantidad, moneda, TC, costos y estado (el costo ya entró al costo promedio). Solo se editan tracking, DAM, fechas y notas.</span></div></section>
          <section><Editables o={o} a={a} /></section>
        </> : <><section><CostTable o={o} lock={false} /></section><section><Datos o={o} /></section></>}
      </div>
      {rec ? (
        <div className="ft2">
          <button type="button" className="btn out dz" aria-disabled="true" aria-describedby={`del-${id}`} onClick={a.remove}>{I(Trash2)}Eliminar</button>
          <span className="why neu" id={`del-${id}`}>{I(Lock)}<span>No se puede eliminar: el stock ya ingresó.</span></span>
        </div>
      ) : (
        <div className="ft2">
          {!can && <button type="button" className="btn out" onClick={a.edit}>{I(Pencil)}Editar</button>}
          <span className="sp" />
          {!can && <button type="button" className="btn out dz" onClick={a.cancel}>{I(CircleX)}Cancelar importación</button>}
          <button type="button" className="btn out dz" onClick={a.remove}>{I(Trash2)}Eliminar</button>
        </div>
      )}
    </article>
  )
}

export function MobileBar({ o, a }: { o: ImportRecord; a: DetailActions }) {
  const nx = NXT[o.estado]
  if (o.estado === "recibida" || o.estado === "cancelada") return null
  return <div className="mbar">{nx
    ? <button type="button" className="btn" aria-disabled={a.busy} onClick={() => { if (!a.busy) a.advance() }}>{I(ArrowRight)}Pasar a {ST[nx][0]}</button>
    : <button type="button" className="btn" onClick={a.receive}>{I(PackageCheck)}Marcar recibida</button>}</div>
}
