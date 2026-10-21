import type { ReactNode } from "react"
import { ChevronRight, CircleAlert, Inbox, RefreshCw, Search } from "lucide-react"
import { EST, ESTI, ESTADOS, SEP, TIPO, fdt, ELL } from "./pvCommon"
import { I, StateChip, Tags } from "./pvParts"
import { PvPager } from "./PvPager"
import type { FiltroEstado, FiltroTipo, FiltroVinculo, PostventaList } from "./usePostventaList"

type Props = { list: PostventaList; selId: number | null; mob: boolean; onPick: (id: number) => void }

const Msg = ({ icon, title, text, bad, children }: { icon: typeof Inbox; title: string; text: string; bad?: boolean; children?: ReactNode }) => (
  <div className="ctr" role={bad ? "alert" : "status"}>
    <span className={`bi${bad ? " bad" : ""}`}>{I(icon, 22)}</span>
    <h3>{title}</h3>
    <p>{text}</p>
    {children}
  </div>
)

function Skeleton({ n }: { n: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <div className="skr" aria-hidden="true" key={i}>
          <div className="sk" style={{ width: `${58 - (i % 3) * 9}%` }} />
          <div className="sk" style={{ width: `${82 - (i % 4) * 8}%` }} />
          <div className="sk" style={{ width: `${34 + (i % 3) * 8}%` }} />
        </div>
      ))}
      <span className="sr" role="status">Cargando solicitudes{ELL}</span>
    </>
  )
}

function Rows({ list, selId, mob, onPick }: Props) {
  return (
    <>
      {list.rows.map(c => (
        <button type="button" key={c.id_solicitud} className="rw2" role="option" aria-selected={c.id_solicitud === selId} onClick={() => onPick(c.id_solicitud)}>
          <span className="rb">
            <span className="l1"><b>{c.nombre}</b><span className="cd mono">{c.codigo_seguimiento}</span></span>
            <span className="l2"><span className="pr" title={c.producto_servicio}>{TIPO[c.tipo]}{SEP}{c.producto_servicio}</span><span className="dt num">{fdt(c.fecha_creacion)}</span></span>
            <span className="l3"><StateChip e={c.estado} /><Tags c={c} /></span>
          </span>
          {I(ChevronRight, 16, "ch")}
        </button>
      ))}
      {mob && <PvPager list={list} mob />}
    </>
  )
}

/** Bandeja: busqueda, chips de estado con contador, filtros de tipo y vinculo, filas. */
export function PvList(p: Props) {
  const { list } = p
  const cnt = (e: FiltroEstado) => (list.status !== "ok" || !list.resumen ? DASH0 : e === "todas" ? list.resumen.total : list.resumen[e])
  let body: ReactNode
  if (list.status === "load") body = <Skeleton n={p.mob ? 5 : 8} />
  else if (list.status === "error") {
    body = (
      <Msg icon={CircleAlert} bad title="No se pudo cargar la bandeja" text={`${list.error} Tus filtros se conservan; no se perdió ninguna solicitud.`}>
        <button type="button" className="btn" onClick={() => void list.load()}>{I(RefreshCw, 16)}Reintentar</button>
      </Msg>
    )
  } else if (list.rows.length === 0 && !list.filtered) {
    body = <Msg icon={Inbox} title="Aún no hay solicitudes" text="Las crea el cliente desde la web pública (cambios y devoluciones) y aparecerán aquí con su código de seguimiento." />
  } else if (list.rows.length === 0) {
    body = (
      <Msg icon={Search} title="Ninguna solicitud coincide" text={list.qs ? `No hay resultados para «${list.qs}» con los filtros actuales.` : "No hay resultados con los filtros actuales."}>
        <button type="button" className="btn out" onClick={list.clear}>Quitar filtros</button>
      </Msg>
    )
  } else body = <Rows {...p} />

  return (
    <div className="lc">
      <div className="srch">
        {I(Search, 18)}
        <input className="in" type="search" value={list.q} placeholder="Buscar código, cliente, pedido o producto" aria-label="Buscar solicitudes" onChange={e => list.setQ(e.target.value)} />
      </div>
      <div className="chips" role="tablist" aria-label="Filtrar por estado">
        {(["todas", ...ESTADOS] as FiltroEstado[]).map(e => (
          <button type="button" key={e} className="chip" role="tab" aria-selected={list.fe === e} onClick={() => list.setFe(e)}>
            {e === "todas" ? "Todas" : <>{I(ESTI[e][0], 14)}{EST[e]}</>} <b>{cnt(e)}</b>
          </button>
        ))}
      </div>
      <div className="flt">
        <select className="sl" aria-label="Tipo" value={list.ft} onChange={e => list.setFt(e.target.value as FiltroTipo)}>
          <option value="todos">Tipo: todos</option>
          <option value="cambio">Tipo: {TIPO.cambio}</option>
          <option value="devolucion">Tipo: {TIPO.devolucion}</option>
          <option value="garantia">Tipo: {TIPO.garantia}</option>
        </select>
        <select className="sl" aria-label="Vinculación" value={list.fv} onChange={e => list.setFv(e.target.value as FiltroVinculo)}>
          <option value="todas">Vinculación: todas</option>
          <option value="vinculadas">Vinculación: vinculadas</option>
          <option value="sin">Vinculación: sin vincular</option>
        </select>
      </div>
      <div className="list" role="listbox" aria-label="Solicitudes">{body}</div>
    </div>
  )
}

const DASH0 = "-"
