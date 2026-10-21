import { Link2, Mail, Phone, TriangleAlert, Unlink } from "lucide-react"
import type { SolicitudPostventa } from "../../services/postventaService"
import { EST, ESTI, TIPO, fdt, fupd, notaLimpia, SEP } from "./pvCommon"
import { I, StateChip, Tags } from "./pvParts"

/** Cabecera del caso: codigo, estado, tipo y etiquetas. En movil el codigo va en la barra superior. */
export function PvHead({ c, mob }: { c: SolicitudPostventa; mob: boolean }) {
  return (
    <>
      <div className="r1">
        {!mob && <h2 className="mono">{c.codigo_seguimiento}</h2>}
        <StateChip e={c.estado} size={16} />
        <span className="tag">{TIPO[c.tipo]}</span>
        <Tags c={c} />
      </div>
      <div className="r2">{c.nombre}{SEP}Recibida {fdt(c.fecha_creacion)}{SEP}Actualizada {fupd(c.fecha_creacion, c.fecha_actualizacion)}</div>
    </>
  )
}

function Timeline({ c }: { c: SolicitudPostventa }) {
  const h = c.historial ?? []
  return (
    <div>
      <div className="sh">Historial{SEP}{h.length} {h.length === 1 ? "paso" : "pasos"}</div>
      <ol className="tl">
        {h.map(x => {
          const nota = notaLimpia(x.nota)
          const [Icon] = ESTI[x.a]
          return (
            <li key={x.id_historial}>
              {I(Icon, 16)}
              <div className="a">
                <b>{x.de ? `${EST[x.de]} → ${EST[x.a]}` : EST[x.a]}</b>
                <span className="w">{x.usuario_id ? `Usuario n.º ${x.usuario_id}` : "Cliente"}{SEP}{fdt(x.creado)}</span>
              </div>
              {nota && <div className="n">{nota}</div>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** Cliente, pedido (vinculo, plazo), motivo/detalle/solucion e historial. */
export function PvInfo({ c }: { c: SolicitudPostventa }) {
  return (
    <>
      <div className="g2">
        <div>
          <div className="sh">Cliente</div>
          <dl className="kv">
            <dt>Nombre</dt><dd>{c.nombre}</dd>
            <dt>{I(Mail, 14)}Correo</dt><dd>{c.email}</dd>
            <dt>{I(Phone, 14)}Teléfono</dt><dd className="num">{c.telefono || "No indicado"}</dd>
          </dl>
        </div>
        <div>
          <div className="sh">Pedido</div>
          <dl className="kv">
            <dt>Número</dt><dd className="mono">{c.numero_pedido}</dd>
            <dt>Cantidad</dt><dd className="num">{c.cantidad} {c.cantidad > 1 ? "unidades" : "unidad"}</dd>
            <dt>Vínculo</dt>
            <dd>{c.vinculado
              ? <span className="st ok">{I(Link2, 14)}Vinculado</span>
              : <span className="st warn">{I(Unlink, 14)}Sin vincular – verificar manualmente</span>}</dd>
            {c.fuera_de_plazo === true && (
              <>
                <dt>Plazo</dt>
                <dd><span className="st warn">{I(TriangleAlert, 14)}Fuera de plazo</span><small className="mut" style={{ display: "block", fontSize: "12.5px" }}>Solo informativo: no bloquea nada.</small></dd>
              </>
            )}
          </dl>
          {!c.vinculado && <p className="hint" style={{ marginTop: 6 }}>El caso no se rechaza: queda para verificación manual.</p>}
        </div>
      </div>
      <div>
        <div className="sh">Solicitud</div>
        <p className="tx"><b>{c.producto_servicio}</b>{SEP}{TIPO[c.tipo]}</p>
        <p className="tx"><b>Motivo:</b> {c.motivo}</p>
        <p className="tx" style={{ whiteSpace: "pre-wrap" }}>{c.detalle}</p>
        <p className="tx"><b>Solución solicitada:</b> {c.solucion_solicitada}</p>
      </div>
      <Timeline c={c} />
    </>
  )
}
