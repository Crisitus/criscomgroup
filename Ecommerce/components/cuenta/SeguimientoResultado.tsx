"use client"

// Resultados de /seguimiento: cabecera con código + chips, bloque de cotización
// (lo más grande de la página), línea de tiempo y tarjetas de datos.
import type { ReactNode } from "react"
import { Clock, Package, Wrench, Cpu, ShoppingBag, CircleAlert, CircleCheck, KeyRound } from "lucide-react"
import type { SolicitudImportacion, SolicitudEnsamblePublica } from "@/services/ecommerceApi"
import type { ServicioTrack } from "./cuentaApi"
import { Chip, TipoChip, Field } from "./CuentaBits"
import {
  fmtMoney, fmtFecha, fmtFechaHora, diasHasta, estadoLabel, estadoVisual,
  TIPO_ENTREGA_LABEL,
} from "./cuentaShared"

export type PedidoSeg = {
  numero_pedido: string
  estado: string
  estado_pago: string
  total_final: number | string
  tipo_entrega: string
  fecha_creacion: string
  detalles?: { producto_nombre: string; cantidad: number; subtotal_con_igv: number | string }[]
}

export type Resultado =
  | { kind: "importacion"; data: SolicitudImportacion }
  | { kind: "ensamble"; data: SolicitudEnsamblePublica }
  | { kind: "pedido"; data: PedidoSeg }
  | { kind: "servicio"; codigo: string; estado: string | null; detalle: ServicioTrack | null }

type Paso = { estado: string; fecha?: string | null; pendiente?: boolean }

const ResHeader = ({ codigo, tipo, chips }: { codigo: string; tipo: string; chips: ReactNode }) => (
  <section className="card rh">
    <span className="code mono">{codigo}</span>
    <TipoChip tipo={tipo} />
    {chips}
  </section>
)

const QuoteCard = ({
  titulo, monto, moneda, nota, fecha, hasta, vencida,
}: {
  titulo: string
  monto: number | string
  moneda: "PEN" | "USD"
  nota?: string | null
  fecha?: string | null
  hasta?: string | null
  vencida?: boolean
}) => {
  const dias = hasta ? diasHasta(hasta) : 0
  return (
    <section className="card quote">
      <div>
        <p className="ql">{titulo}</p>
        <p className="amt num">{fmtMoney(monto, moneda)}</p>
        <p className="mut">
          {[nota, fecha ? `Cotizada el ${fmtFecha(fecha)}` : null].filter(Boolean).join(" · ")}
        </p>
      </div>
      {hasta && (
        <div className="qv">
          <p className={`vl num${vencida ? " red" : ""}`}>
            {`${vencida ? "Venció el " : "Válida hasta el "}${fmtFecha(hasta)}`}
          </p>
          {vencida ? (
            <span className="chip t-r">
              <CircleAlert size={14} strokeWidth={1.75} aria-hidden />
              {`Vencida · hace ${Math.max(0, -dias)} ${-dias === 1 ? "día" : "días"}`}
            </span>
          ) : (
            <span className="chip t-g">
              <CircleCheck size={14} strokeWidth={1.75} aria-hidden />
              {`Vigente · ${dias === 1 ? "falta 1 día" : `faltan ${Math.max(0, dias)} días`}`}
            </span>
          )}
        </div>
      )}
    </section>
  )
}

const Timeline = ({ titulo, pasos }: { titulo: string; pasos: Paso[] }) => (
  <section className="card">
    <div className="ch">
      <Clock size={18} strokeWidth={1.75} aria-hidden />
      {titulo}
    </div>
    <ol className="tl">
      {pasos.map((p, i) => {
        const esUltimo = i === pasos.length - 1 && !p.pendiente
        const [Icon] = estadoVisual(p.estado)
        return (
          <li key={`${p.estado}-${i}`} className={p.pendiente ? "" : esUltimo ? "cur" : "done"}>
            <span className="dot"><Icon size={14} strokeWidth={1.75} aria-hidden /></span>
            <div>
              <p className="tt">
                {estadoLabel(p.estado)}
                {esUltimo && <span className="now">Estado actual</span>}
                {p.pendiente && (
                  <small className="mut" style={{ fontWeight: 500 }}>Aún no ocurre</small>
                )}
              </p>
              {p.fecha && <p className="td mut num">{fmtFechaHora(p.fecha)}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  </section>
)

const DataCard = ({
  titulo, icon: Icon, rows,
}: { titulo: string; icon: typeof Package; rows: [string, ReactNode][] }) => (
  <section className="card">
    <div className="ch">
      <Icon size={18} strokeWidth={1.75} aria-hidden />
      {titulo}
    </div>
    {rows.map(([k, v]) => (
      <dl className="kv" key={k}>
        <dt>{k}</dt>
        <dd>{v}</dd>
      </dl>
    ))}
  </section>
)

// Cotización visible solo en cotizada/aprobada/en_transito/en_ensamble/entregada
// (la nota también en rechazada); el backend ya manda los campos solo cuando van.
const conCotizacion = (d: { cotizacion_monto?: number | null }) => d.cotizacion_monto != null

const ORDEN_PEDIDO = ["pendiente_pago", "confirmado", "preparando", "enviado", "entregado"]
const ORDEN_SERVICIO = ["pendiente", "contactado", "recibido"]

const MODO_LABEL: Record<string, string> = {
  marketplace: "Armado con productos elegidos",
  presupuesto: "Armado por presupuesto",
  ensamble_propio: "Solo servicio de ensamblaje",
}
const TIER_LABEL: Record<string, string> = {
  oficina: "Oficina (S/ 1,500 – 2,500)",
  gamer: "Gamer / Trabajo (S/ 2,500 – 4,500)",
  alto_rendimiento: "Alto rendimiento (S/ 4,500 – 7,500)",
  workstation: "Workstation / Pro (S/ 7,500+)",
  otro: "Otro presupuesto",
}
const cap = (s?: string | null) => (s ? s[0].toUpperCase() + s.slice(1) : s)

const VistaImportacion = ({ d }: { d: SolicitudImportacion }) => (
  <div className="stack">
    <ResHeader codigo={d.codigo_seguimiento ?? ""} tipo="importacion" chips={<Chip estado={d.estado} />} />
    {conCotizacion(d) && (
      <QuoteCard
        titulo="Cotización"
        monto={d.cotizacion_monto ?? 0}
        moneda="USD"
        nota={d.cotizacion_nota}
        fecha={d.cotizacion_fecha}
        hasta={d.valida_hasta}
        vencida={d.vencida}
      />
    )}
    {d.estado === "rechazada" && d.cotizacion_nota && !conCotizacion(d) && (
      <div className="card" style={{ padding: "12px 14px" }}>
        <p className="err" style={{ margin: 0 }}>
          <CircleAlert size={14} strokeWidth={1.75} aria-hidden />
          {d.cotizacion_nota}
        </p>
      </div>
    )}
    <div className="g2">
      <Timeline
        titulo="Avance de tu importación"
        pasos={(d.linea_tiempo ?? []).map((p) => ({ estado: p.estado, fecha: p.fecha }))}
      />
      <DataCard
        titulo="Producto"
        icon={Package}
        rows={[
          ["Producto", d.nombre_producto],
          ["Tipo", cap(d.tipo_producto) ?? "—"],
          ...(d.marca ? [["Marca", d.marca] as [string, ReactNode]] : []),
          ...(d.modelo ? [["Modelo", d.modelo] as [string, ReactNode]] : []),
          ["Cantidad", String(d.cantidad)],
          ["Urgencia", cap(d.nivel_urgencia) ?? "—"],
          ...(d.fecha_entrega_estimada
            ? [["Entrega estimada", fmtFecha(d.fecha_entrega_estimada)] as [string, ReactNode]]
            : []),
        ]}
      />
    </div>
  </div>
)

const VistaEnsamble = ({ d }: { d: SolicitudEnsamblePublica }) => {
  const esMarketplace = d.modo === "marketplace" && Array.isArray(d.productos) && d.productos.length > 0
  return (
    <div className="stack">
      <ResHeader codigo={d.codigo_seguimiento ?? ""} tipo="ensamble" chips={<Chip estado={d.estado} />} />
      {conCotizacion(d) && (
        <QuoteCard
          titulo="Cotización · IGV incluido"
          monto={d.cotizacion_monto ?? 0}
          moneda="PEN"
          nota={d.cotizacion_nota}
          fecha={d.cotizacion_fecha}
          hasta={d.valida_hasta}
          vencida={d.vencida}
        />
      )}
      <div className="g2">
        <Timeline
          titulo="Avance de tu ensamble"
          pasos={(d.linea_tiempo ?? []).map((p) => ({ estado: p.estado, fecha: p.fecha }))}
        />
        {esMarketplace ? (
          <section className="card">
            <div className="ch">
              <Cpu size={18} strokeWidth={1.75} aria-hidden />
              Productos del ensamble
            </div>
            <dl className="kv">
              <dt>Modo</dt>
              <dd>{MODO_LABEL[d.modo ?? "presupuesto"]}</dd>
            </dl>
            {(d.productos ?? []).map((p, i) => (
              <div className="prow" key={`${p.nombre}-${i}`}>
                <b>{p.nombre}</b>
                <span className="num mut">{`${p.cantidad} × ${fmtMoney(p.precio ?? 0)}`}</span>
              </div>
            ))}
            {d.total_referencial != null && (
              <div className="prow">
                <b>Total referencial</b>
                <b className="num">{fmtMoney(d.total_referencial)}</b>
              </div>
            )}
          </section>
        ) : (
          <DataCard
            titulo="Tu solicitud"
            icon={Cpu}
            rows={[
              ["Modo", MODO_LABEL[d.modo ?? "presupuesto"]],
              ...(d.tier_presupuesto
                ? [["Presupuesto", TIER_LABEL[d.tier_presupuesto] ?? d.tier_presupuesto] as [string, ReactNode]]
                : []),
              ...(d.uso_descripcion ? [["Uso", d.uso_descripcion] as [string, ReactNode]] : []),
              ...(d.incluye_perifericos
                ? [["Incluye", d.incluye_perifericos === "con_perifericos" ? "PC + periféricos" : "Solo el PC"] as [string, ReactNode]]
                : []),
              ...(d.fecha_entrega_estimada
                ? [["Entrega estimada", fmtFecha(d.fecha_entrega_estimada)] as [string, ReactNode]]
                : []),
            ]}
          />
        )}
      </div>
    </div>
  )
}

const VistaPedido = ({ d }: { d: PedidoSeg }) => {
  const cancelado = d.estado === "cancelado"
  const idx = ORDEN_PEDIDO.indexOf(d.estado)
  const pasos: Paso[] = cancelado
    ? [{ estado: "pendiente_pago", fecha: d.fecha_creacion }, { estado: "cancelado" }]
    : ORDEN_PEDIDO.map((e, i) => ({
        estado: e,
        fecha: i === 0 ? d.fecha_creacion : null,
        pendiente: i > idx,
      }))
  return (
    <div className="stack">
      <ResHeader
        codigo={d.numero_pedido}
        tipo="pedido"
        chips={
          <>
            <Chip estado={d.estado} />
            <Chip estado={d.estado_pago} texto={d.estado_pago === "pendiente" ? "Pago: Pendiente" : undefined} />
          </>
        }
      />
      <section className="card quote">
        <div>
          <p className="ql">Total del pedido · IGV incluido</p>
          <p className="amt num">{fmtMoney(d.total_final)}</p>
        </div>
      </section>
      <div className="g2">
        <Timeline titulo="Avance de tu pedido" pasos={pasos} />
        <DataCard
          titulo="Pedido"
          icon={ShoppingBag}
          rows={[
            ["Número", <span className="mono" key="n">{d.numero_pedido}</span>],
            ["Fecha", fmtFecha(d.fecha_creacion)],
            ["Entrega", TIPO_ENTREGA_LABEL[d.tipo_entrega] ?? d.tipo_entrega],
            ["Pago", <Chip estado={d.estado_pago} key="p" />],
          ]}
        />
      </div>
    </div>
  )
}

const VistaServicio = ({
  codigo, estado, detalle, token, onToken, onConsultarToken, tokenLoading, tokenError,
}: {
  codigo: string
  estado: string | null
  detalle: ServicioTrack | null
  token: string
  onToken: (v: string) => void
  onConsultarToken: () => void
  tokenLoading: boolean
  tokenError: string | null
}) => {
  const estadoSimple = detalle ? detalle.estado : estado
  const pasosSimples: Paso[] | null = estadoSimple
    ? ORDEN_SERVICIO.map((e) => {
        const idx = ORDEN_SERVICIO.indexOf(estadoSimple)
        const i = ORDEN_SERVICIO.indexOf(e)
        return { estado: e, pendiente: i > idx }
      })
    : null
  return (
    <div className="stack">
      <ResHeader
        codigo={detalle ? detalle.codigo : codigo}
        tipo="servicio"
        chips={estadoSimple ? <Chip estado={estadoSimple} /> : null}
      />
      {pasosSimples && !detalle && (
        <div className="g2">
          <Timeline titulo="Estado de tu solicitud" pasos={pasosSimples} />
        </div>
      )}
      {detalle && (
        <div className="g2">
          {detalle.avances.length > 0 ? (
            <Timeline
              titulo="Avances del servicio"
              pasos={detalle.avances.map((a) => ({ estado: a.estado, fecha: a.fecha }))}
            />
          ) : (
            pasosSimples && <Timeline titulo="Estado de tu servicio" pasos={pasosSimples} />
          )}
          <DataCard
            titulo="Equipo"
            icon={Wrench}
            rows={[
              ["Equipo", detalle.equipo || "—"],
              ...(detalle.fecha_ingreso
                ? [["Ingreso", fmtFecha(detalle.fecha_ingreso)] as [string, ReactNode]]
                : []),
              ...(detalle.fecha_entrega_estimada
                ? [["Entrega estimada", fmtFecha(detalle.fecha_entrega_estimada)] as [string, ReactNode]]
                : []),
              ...(detalle.garantia_fin
                ? [["Garantía hasta", fmtFecha(detalle.garantia_fin)] as [string, ReactNode]]
                : []),
            ]}
          />
        </div>
      )}
      {detalle && detalle.evidencias.length > 0 && (
        <section className="card">
          <div className="ch">
            <KeyRound size={18} strokeWidth={1.75} aria-hidden />
            Evidencias
          </div>
          {detalle.evidencias.map((ev) => (
            <dl className="kv" key={ev.id_evidencia_servicio}>
              <dt>{ev.etapa}</dt>
              <dd>
                <a className="lnk" href={ev.archivo_url} target="_blank" rel="noopener noreferrer">
                  {ev.descripcion || "Ver evidencia"}
                </a>
              </dd>
            </dl>
          ))}
        </section>
      )}
      {!detalle && (
        <section className="card">
          <div className="ch">
            <KeyRound size={18} strokeWidth={1.75} aria-hidden />
            Avances y evidencias
          </div>
          <p className="pbar mut">
            Este código confirma que recibimos tu solicitud. Para ver avances y evidencias,
            ingresa el token de tu orden de servicio.
          </p>
          {tokenError && (
            <p className="err" role="alert" style={{ padding: "0 20px 12px", margin: 0 }}>
              <CircleAlert size={14} strokeWidth={1.75} aria-hidden />
              {tokenError}
            </p>
          )}
          <div className="tokrow">
            <Field
              id="seg-token"
              label="Token de la orden"
              value={token}
              onChange={onToken}
              placeholder="Pega aquí el token"
            />
            <button className="btn o" type="button" onClick={onConsultarToken} disabled={tokenLoading}>
              {tokenLoading ? "Consultando…" : "Ver detalle"}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

export const ResultadoView = (props: {
  resultado: Resultado
  token: string
  onToken: (v: string) => void
  onConsultarToken: () => void
  tokenLoading: boolean
  tokenError: string | null
}) => {
  const r = props.resultado
  switch (r.kind) {
    case "importacion":
      return <VistaImportacion d={r.data} />
    case "ensamble":
      return <VistaEnsamble d={r.data} />
    case "pedido":
      return <VistaPedido d={r.data} />
    case "servicio":
      return (
        <VistaServicio
          codigo={r.codigo}
          estado={r.estado}
          detalle={r.detalle}
          token={props.token}
          onToken={props.onToken}
          onConsultarToken={props.onConsultarToken}
          tokenLoading={props.tokenLoading}
          tokenError={props.tokenError}
        />
      )
  }
}
