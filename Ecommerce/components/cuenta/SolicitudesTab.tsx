"use client"

// Pestaña Mis solicitudes (GET /api/ecommerce/mis-solicitudes): tabla en
// desktop, tarjetas en movil, con chip de tipo, estado del backend y
// paginación. Cada fila enlaza a /seguimiento con el código puesto.
import Link from "next/link"
import { ArrowRight, ChevronLeft, ChevronRight, Search } from "lucide-react"
import type { MisSolicitudesResp } from "./cuentaApi"
import { Chip, TipoChip, Cargando, ErrorCarga } from "./CuentaBits"
import { fmtFecha } from "./cuentaShared"

const SolicitudesTab = ({
  resp, error, pagina, onPagina, onRetry,
}: {
  resp: MisSolicitudesResp | null
  error: boolean
  pagina: number
  onPagina: (p: number) => void
  onRetry: () => void
}) => {
  if (error) {
    return (
      <ErrorCarga
        titulo="No pudimos cargar tus solicitudes"
        detalle="Esto no significa que no tengas solicitudes: la consulta falló. Revisa tu conexión e inténtalo de nuevo."
        onRetry={onRetry}
      />
    )
  }
  if (!resp) return <Cargando texto="Cargando tus solicitudes…" />
  const { data, paginacion } = resp

  if (data.length === 0) {
    return (
      <div className="card empty">
        <Search size={28} strokeWidth={1.75} aria-hidden />
        <h2>Aún no tienes solicitudes</h2>
        <p className="mut">Tus solicitudes de importación, ensamble o servicio técnico aparecerán aquí.</p>
        <Link className="btn p" href="/seguimiento">Consultar un código</Link>
      </div>
    )
  }

  const pager = (
    <div className="pg">
      <small className="mut num">
        {`Página ${paginacion.pagina} de ${paginacion.paginas} · ${paginacion.total} ${paginacion.total === 1 ? "solicitud" : "solicitudes"}`}
      </small>
      <span className="pb">
        <button className="btn o" type="button" disabled={paginacion.pagina <= 1} onClick={() => onPagina(pagina - 1)}>
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden />
          Anterior
        </button>
        <button className="btn o" type="button" disabled={paginacion.pagina >= paginacion.paginas} onClick={() => onPagina(pagina + 1)}>
          Siguiente
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden />
        </button>
      </span>
    </div>
  )

  const accion = (codigo: string) => (
    <Link className="btn o" href={`/seguimiento?codigo=${encodeURIComponent(codigo)}`}>
      Ver seguimiento
      <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
    </Link>
  )

  return (
    <>
      <div className="card tb sol-tb">
        <div className="tr h">
          <span>Tipo</span>
          <span>Código</span>
          <span>Estado</span>
          <span>Fecha</span>
          <span className="end">Acción</span>
        </div>
        {data.map((s) => (
          <div className="tr" key={`${s.tipo}-${s.codigo}`}>
            <span><TipoChip tipo={s.tipo} /></span>
            <span className="mono" style={{ fontWeight: 650, overflowWrap: "anywhere" }}>{s.codigo}</span>
            <span><Chip estado={s.estado} /></span>
            <span className="num">{fmtFecha(s.fecha)}</span>
            <span className="end">{accion(s.codigo)}</span>
          </div>
        ))}
        {pager}
      </div>
      <div className="sol-cards">
        {data.map((s) => (
          <article className="card sc" key={`${s.tipo}-${s.codigo}`}>
            <div className="top">
              <TipoChip tipo={s.tipo} />
              <small className="mut num">{fmtFecha(s.fecha)}</small>
            </div>
            <p className="code mono">{s.codigo}</p>
            <div><Chip estado={s.estado} /></div>
            <Link className="btn o w" href={`/seguimiento?codigo=${encodeURIComponent(s.codigo)}`}>
              Ver seguimiento
              <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
            </Link>
          </article>
        ))}
        <div className="card">{pager}</div>
      </div>
    </>
  )
}

export default SolicitudesTab
