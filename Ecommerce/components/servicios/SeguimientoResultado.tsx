"use client"

// Resultado del seguimiento de orden tecnica: cabecera con codigo/equipo/chip de
// estado, fechas, linea de tiempo de avances y cuadricula de evidencias.
// Estados vacios explicitos (icono + palabra), nunca tarjetas en blanco.
import React from "react"
import {
  Circle, CircleCheck, CircleX, Clock, FileText, FlaskConical, Image as ImageIcon,
  Package, Search, Wrench,
} from "lucide-react"
import { fmtFecha, fmtFechaHora } from "./serviciosShared"

export type Avance = { estado: string; fecha: string }
export type Evidencia = {
  id_evidencia_servicio: number
  etapa: string
  tipo: string
  mime?: string
  descripcion?: string
  archivo_url: string
  creado_en: string
}
export type Orden = {
  codigo: string
  equipo: string
  estado: string
  fecha_ingreso: string
  fecha_entrega_estimada?: string | null
  garantia_fin?: string | null
  avances: Avance[]
  evidencias: Evidencia[]
}

const ESTADOS: Record<string, { label: string; icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }> }> = {
  recibido: { label: "Recibido", icon: Circle },
  diagnostico: { label: "En diagnóstico", icon: Search },
  cotizado: { label: "Cotizado", icon: FileText },
  aprobado: { label: "Aprobado", icon: CircleCheck },
  en_proceso: { label: "En reparación", icon: Wrench },
  pruebas: { label: "En pruebas", icon: FlaskConical },
  listo: { label: "Listo para entregar", icon: Package },
  entregado: { label: "Entregado", icon: CircleCheck },
  cancelado: { label: "Cancelado", icon: CircleX },
}

const ChipEstado = ({ estado }: { estado: string }) => {
  const info = ESTADOS[estado] || { label: estado, icon: Circle }
  const Icono = info.icon
  const clase = estado === "entregado" || estado === "listo" ? "chip ok2" : estado === "cancelado" ? "chip bad" : "chip"
  return (
    <span className={clase}>
      <Icono size={16} className="ic" aria-hidden />
      <span>{info.label}</span>
    </span>
  )
}

const Vacio = ({ icono, titulo, detalle }: { icono: "clock" | "image"; titulo: string; detalle: string }) => (
  <div className="empty">
    <span className="ei">{icono === "clock" ? <Clock size={22} className="ic" aria-hidden /> : <ImageIcon size={22} className="ic" aria-hidden />}</span>
    <b>{titulo}</b>
    <span className="mut">{detalle}</span>
  </div>
)

const SeguimientoResultado = ({ orden }: { orden: Orden }) => (
  <>
    <section className="card" aria-label="Estado de la orden">
      <div className="rh">
        <div>
          <p className="mut">Orden</p>
          <p className="cd num">{orden.codigo}</p>
          <p className="eq">{orden.equipo}</p>
        </div>
        <ChipEstado estado={orden.estado} />
      </div>
      <dl className="dts">
        <div>
          <dt>Fecha de ingreso</dt>
          <dd>{fmtFecha(orden.fecha_ingreso)}</dd>
        </div>
        <div>
          <dt>Entrega estimada</dt>
          <dd>{orden.fecha_entrega_estimada ? fmtFecha(orden.fecha_entrega_estimada) : "Por confirmar"}</dd>
        </div>
        <div>
          <dt>Garantía</dt>
          <dd>{orden.garantia_fin ? `Hasta el ${fmtFecha(orden.garantia_fin)}` : "Sin garantía registrada"}</dd>
        </div>
      </dl>
    </section>
    <div className="cols2">
      <section className="card" aria-label="Avances">
        <h2>Avances</h2>
        {orden.avances.length === 0 ? (
          <Vacio icono="clock" titulo="El técnico aún no publica avances" detalle="Cuando registre un avance, aparecerá aquí con su fecha." />
        ) : (
          <ol className="tl">
            {orden.avances.map((a, i) => (
              <li key={`${a.estado}-${i}`}>
                <b>{ESTADOS[a.estado]?.label || a.estado}</b>
                <time dateTime={a.fecha}>{fmtFechaHora(a.fecha)}</time>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section className="card" aria-label="Evidencias">
        <h2>Evidencias</h2>
        {orden.evidencias.length === 0 ? (
          <Vacio icono="image" titulo="El técnico aún no publica evidencias" detalle="Las fotos y archivos del trabajo se mostrarán aquí." />
        ) : (
          <div className="evs">
            {orden.evidencias.map((ev) => (
              <figure className="ev" key={ev.id_evidencia_servicio}>
                <a className="img" href={ev.archivo_url} target="_blank" rel="noreferrer">
                  {ev.tipo === "imagen" ? (
                    <img src={ev.archivo_url} alt={ev.descripcion || `Evidencia de ${ev.etapa}`} loading="lazy" />
                  ) : (
                    <>
                      <FileText size={28} className="ic" aria-hidden />
                      <span>Archivo adjunto</span>
                    </>
                  )}
                </a>
                <figcaption>
                  <b className="cap">{ev.etapa}</b>
                  <span className="mut">{ev.descripcion || "Actualización del servicio"}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </div>
  </>
)

export default SeguimientoResultado
