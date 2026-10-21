"use client"

// Cambios, devoluciones y garantías (port criscom-ecom-contenido): dos zonas —
// Nueva solicitud y Consultar seguimiento — con pestañas en móvil para que la
// consulta quede accesible desde el inicio. Estados reales con icono + palabra.
import { FormEvent, useState } from "react"
import Link from "next/link"
import {
  BookOpen, CheckCheck, ChevronDown, Circle, CircleAlert, CircleCheck, CircleX,
  Hourglass, Inbox, Search, Send, ShieldCheck,
} from "lucide-react"
import { ecommercePostventaService, type PostventaPublica } from "@/services/ecommerceApi"
import { PageHead, Estado, Alerta } from "./contenidoShared"
import { Campo, Opcion, Honeypot } from "./Campos"

const TIPO_LABEL: Record<string, string> = { cambio: "Cambio", devolucion: "Devolución", garantia: "Garantía" }

// Estados reales del contrato; desconocido = texto neutro.
const ESTADOS: Record<string, { texto: string; tono: "neu" | "pri" | "warn" | "ok" | "bad"; icono: typeof Circle }> = {
  recibida: { texto: "Recibida", tono: "neu", icono: Inbox },
  en_revision: { texto: "En revisión", tono: "pri", icono: Search },
  esperando_cliente: { texto: "Esperando cliente", tono: "warn", icono: Hourglass },
  aprobada: { texto: "Aprobada", tono: "ok", icono: CircleCheck },
  rechazada: { texto: "Rechazada", tono: "bad", icono: CircleX },
  resuelta: { texto: "Resuelta", tono: "ok", icono: CheckCheck },
}

export function EstadoPostventa({ estado }: { estado: string }) {
  const e = ESTADOS[estado] ?? { texto: "Estado no disponible", tono: "neu" as const, icono: Circle }
  return <Estado tono={e.tono} texto={e.texto} icono={e.icono} />
}

// Fecha+hora del backend (ya llega en hora de Lima): dd/mm/aaaa h:mm a. m.
const fmtFechaHora = (iso: string): string => {
  const d = new Date(String(iso).replace(" ", "T"))
  if (isNaN(d.getTime())) return String(iso || "")
  const f = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric" }).format(d)
  const h = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "numeric", minute: "2-digit", hour12: true }).format(d)
  return `${f} ${h.toLowerCase()}`
}

const inputProps = (id: string, err?: string) =>
  ({ id, className: "inp", ...(err ? { "aria-invalid": true as const, "aria-describedby": `${id}-m` } : {}) })

type FormState = {
  nombre: string; email: string; telefono: string; numero_pedido: string
  tipo: "cambio" | "devolucion" | "garantia"; producto_servicio: string
  motivo: string; cantidad: string; detalle: string; solucion_solicitada: string
  acepta_declaracion: boolean
}

const INICIAL: FormState = {
  nombre: "", email: "", telefono: "", numero_pedido: "", tipo: "garantia",
  producto_servicio: "", motivo: "", cantidad: "1", detalle: "", solucion_solicitada: "",
  acepta_declaracion: false,
}

const IDS: Record<string, string> = {
  nombre: "cb-nombre", email: "cb-email", telefono: "cb-telefono", numero_pedido: "cb-pedido",
  producto_servicio: "cb-producto", motivo: "cb-motivo", cantidad: "cb-cantidad",
  detalle: "cb-detalle", solucion_solicitada: "cb-solucion", acepta_declaracion: "cb-decl",
}

export default function CambiosPage() {
  const [tab, setTab] = useState<"nueva" | "seg">("nueva")
  const [form, setForm] = useState<FormState>(INICIAL)
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState("")
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [exito, setExito] = useState<PostventaPublica | null>(null)
  const [website, setWebsite] = useState("")

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const faltan = !form.nombre.trim() || !form.email.trim() || !form.numero_pedido.trim()
    || !form.producto_servicio.trim() || !form.motivo.trim() || form.detalle.trim().length < 20
    || !form.solucion_solicitada.trim() || !form.acepta_declaracion

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setMensaje(""); setErrores({})
    setEnviando(true)
    try {
      const res = await ecommercePostventaService.crear({
        nombre: form.nombre, email: form.email, telefono: form.telefono || undefined,
        numero_pedido: form.numero_pedido, tipo: form.tipo,
        producto_servicio: form.producto_servicio, motivo: form.motivo,
        cantidad: Number(form.cantidad) || 1, detalle: form.detalle,
        solucion_solicitada: form.solucion_solicitada, acepta_declaracion: true,
        ...(website ? { website } : {}),
      })
      setExito(res.data)
      setForm(INICIAL)
      window.scrollTo({ top: 0, behavior: "instant" })
    } catch (err) {
      const data = (err as { response?: { data?: { message?: string; errores?: Record<string, string> } } })?.response?.data
      setErrores(data?.errores ?? {})
      setMensaje(data?.message || "No pudimos registrar la solicitud. Intenta nuevamente o comunícate con nosotros.")
      window.scrollTo({ top: 0, behavior: "instant" })
    } finally {
      setEnviando(false)
    }
  }

  const accionLibro = (
    <Link className="btn btn-s" href="/libro-reclamaciones">
      <BookOpen size={16} strokeWidth={1.75} className="pg-ic" aria-hidden />
      ¿Necesitas presentar un reclamo?
    </Link>
  )
  const sub = (
    <>
      Registra tu caso, conserva el código y consulta su avance. Nunca solicitaremos claves, CVV ni códigos de autenticación.
    </>
  )

  if (exito) return <ExitoView d={exito} onSeguimiento={() => { setExito(null); setTab("seg") }} accionLibro={accionLibro} sub={sub} />

  const nErr = Object.keys(errores).length

  return (
    <div className="pg-contenido"><div className="wrap">
      <PageHead titulo="Cambios, devoluciones y garantías" sub={sub}
        iconoSub={<ShieldCheck size={14} strokeWidth={1.75} className="pg-ic" aria-hidden />}
        accion={accionLibro} />

      <div className="tabs" role="tablist" aria-label="Secciones">
        <button className="tab" role="tab" type="button" aria-selected={tab === "nueva"} onClick={() => setTab("nueva")}>Nueva solicitud</button>
        <button className="tab" role="tab" type="button" aria-selected={tab === "seg"} onClick={() => setTab("seg")}>Consultar seguimiento</button>
      </div>

      <div className="two cd">
        <div className={`pnl${tab === "seg" ? " off" : ""}`}>
          <details className="fold">
            <summary>Antes de enviar <ChevronDown size={16} strokeWidth={1.75} className="pg-ic cv" aria-hidden /></summary>
            <div className="in">
              <ul>
                <li>Conserva embalaje, accesorios y números de serie.</li>
                <li>Evita manipular un producto con daño inicial.</li>
                <li>La evaluación define reparación, cambio u otra solución aplicable.</li>
                <li>Los plazos bancarios pueden afectar un reembolso aprobado.</li>
              </ul>
            </div>
          </details>

          <form className="card" noValidate onSubmit={submit}>
            {nErr > 0 && (
              <Alerta tono="bad" titulo={`Revisa ${nErr} ${nErr === 1 ? "campo" : "campos"} antes de registrar`}>
                <p>La solicitud no se envió. {mensaje}</p>
                <ul>
                  {Object.entries(errores).map(([campo, msg]) => (
                    <li key={campo}><a href={`#${IDS[campo] || "cb-nombre"}`}>{msg}</a></li>
                  ))}
                </ul>
              </Alerta>
            )}
            {nErr === 0 && mensaje && <Alerta tono="warn" titulo="No se pudo registrar"><p>{mensaje}</p></Alerta>}

            <h2 style={{ fontSize: 18, lineHeight: "26px", margin: "0 0 16px" }}>Cuéntanos qué ocurrió</h2>
            <div className="grid2">
              <Campo id="cb-nombre" label="Nombre completo" error={errores.nombre}>
                <input {...inputProps("cb-nombre", errores.nombre)} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} autoComplete="name" />
              </Campo>
              <Campo id="cb-email" label="Correo" error={errores.email}>
                <input {...inputProps("cb-email", errores.email)} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
              </Campo>
              <Campo id="cb-telefono" label="Teléfono" opcional error={errores.telefono}>
                <input {...inputProps("cb-telefono", errores.telefono)} type="tel" value={form.telefono} onChange={(e) => set("telefono", e.target.value)} autoComplete="tel" />
              </Campo>
              <Campo id="cb-pedido" label="Pedido o comprobante" error={errores.numero_pedido}>
                <input {...inputProps("cb-pedido", errores.numero_pedido)} value={form.numero_pedido} onChange={(e) => set("numero_pedido", e.target.value)} />
              </Campo>
              <div className="s2">
                <i className="lbl" style={{ fontStyle: "normal" }}>Tipo de atención</i>
                <div role="radiogroup" aria-label="Tipo de atención" style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", marginTop: 6 }}>
                  <Opcion tipo="radio" nombre="tipo" marcado={form.tipo === "cambio"} onCambio={() => set("tipo", "cambio")} titulo="Cambio" />
                  <Opcion tipo="radio" nombre="tipo" marcado={form.tipo === "devolucion"} onCambio={() => set("tipo", "devolucion")} titulo="Devolución" />
                  <Opcion tipo="radio" nombre="tipo" marcado={form.tipo === "garantia"} onCambio={() => set("tipo", "garantia")} titulo="Garantía" />
                </div>
              </div>
              <div className="s2">
                <Campo id="cb-producto" label="Producto o servicio" error={errores.producto_servicio}>
                  <input {...inputProps("cb-producto", errores.producto_servicio)} value={form.producto_servicio} onChange={(e) => set("producto_servicio", e.target.value)} />
                </Campo>
              </div>
              <Campo id="cb-motivo" label="Motivo breve" error={errores.motivo}>
                <input {...inputProps("cb-motivo", errores.motivo)} placeholder="Ej. falla al encender" value={form.motivo} onChange={(e) => set("motivo", e.target.value)} />
              </Campo>
              <Campo id="cb-cantidad" label="Cantidad" error={errores.cantidad} hint="Entre 1 y 999.">
                <input {...inputProps("cb-cantidad", errores.cantidad)} type="number" min={1} max={999} inputMode="numeric" value={form.cantidad} onChange={(e) => set("cantidad", e.target.value)} />
              </Campo>
              <div className="s2">
                <Campo id="cb-detalle" label="Detalle del caso" error={errores.detalle} hint="Entre 20 y 4000 caracteres.">
                  <textarea {...inputProps("cb-detalle", errores.detalle)} rows={5} value={form.detalle} onChange={(e) => set("detalle", e.target.value)} />
                </Campo>
              </div>
              <div className="s2">
                <Campo id="cb-solucion" label="Solución que solicitas" error={errores.solucion_solicitada}>
                  <textarea {...inputProps("cb-solucion", errores.solucion_solicitada)} rows={3} value={form.solucion_solicitada} onChange={(e) => set("solucion_solicitada", e.target.value)} />
                </Campo>
              </div>
              <div className="s2">
                <div id="cb-decl">
                  <Opcion tipo="checkbox" nombre="acepta_declaracion" marcado={form.acepta_declaracion}
                    onCambio={(v) => set("acepta_declaracion", v)} invalida={!!errores.acepta_declaracion}
                    titulo="Declaro que la información es correcta y autorizo el contacto necesario para gestionar este caso." />
                </div>
                {errores.acepta_declaracion && (
                  <i className="err" style={{ fontStyle: "normal", marginTop: 6 }}>
                    <CircleAlert size={14} strokeWidth={1.75} className="pg-ic" aria-hidden />
                    {errores.acepta_declaracion}
                  </i>
                )}
              </div>
            </div>
            <Honeypot valor={website} onCambio={setWebsite} />
            <div className="sbar">
              <button className="btn btn-p" type="submit" disabled={enviando || faltan} aria-describedby={faltan ? "cb-why" : undefined}>
                <Send size={16} strokeWidth={1.75} className="pg-ic" aria-hidden />
                {enviando ? "Registrando…" : "Registrar solicitud"}
              </button>
              {faltan
                ? <small className="hint" id="cb-why"><CircleAlert size={14} strokeWidth={1.75} className="pg-ic" aria-hidden style={{ verticalAlign: "-2px" }} /> Completa los campos obligatorios y marca la declaración para registrar.</small>
                : <small className="hint">Recibirás un código POS para consultar el avance.</small>}
            </div>
          </form>
        </div>

        <div className={`pnl stk${tab === "seg" ? "" : " off"}`}>
          <Seguimiento />
        </div>
      </div>
    </div></div>
  )
}

// Éxito de nueva solicitud: código POS grande + "guárdalo" + accesos.
function ExitoView({ d, onSeguimiento, accionLibro, sub }: {
  d: PostventaPublica
  onSeguimiento: () => void
  accionLibro: React.ReactNode
  sub: React.ReactNode
}) {
  return (
    <div className="pg-contenido"><div className="wrap">
      <PageHead titulo="Cambios, devoluciones y garantías" sub={sub}
        iconoSub={<ShieldCheck size={14} strokeWidth={1.75} className="pg-ic" aria-hidden />}
        accion={accionLibro} />
      <section className="card narrow" aria-live="polite">
        <div className="ok-h"><Estado tono="ok" texto="Solicitud registrada" /></div>
        <p className="hint" style={{ margin: 0 }}>Tu código de seguimiento</p>
        <div className="big pos">{d.codigo_seguimiento}</div>
        <p style={{ margin: "0 0 16px", fontWeight: 650 }}>Guárdalo: lo necesitas para consultar el avance de tu caso.</p>
        <dl className="dl">
          <div><dt>Tipo</dt><dd>{TIPO_LABEL[d.tipo] ?? d.tipo}</dd></div>
          <div><dt>Producto o servicio</dt><dd>{d.producto_servicio}</dd></div>
          <div><dt>Estado</dt><dd><EstadoPostventa estado={d.estado} /></dd></div>
        </dl>
        <div className="acts">
          <button className="btn btn-p" type="button" onClick={onSeguimiento}>
            <Search size={16} strokeWidth={1.75} className="pg-ic" aria-hidden />
            Consultar seguimiento
          </button>
          {accionLibro}
        </div>
      </section>
    </div></div>
  )
}

// Consulta de seguimiento POS-: código + correo o 4 últimos dígitos del teléfono.
function Seguimiento() {
  const [codigo, setCodigo] = useState("")
  const [factorTipo, setFactorTipo] = useState<"email" | "tel">("email")
  const [factor, setFactor] = useState("")
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState("")
  const [res, setRes] = useState<PostventaPublica | null>(null)

  const consultar = async (e: FormEvent) => {
    e.preventDefault()
    setError(""); setRes(null); setBuscando(true)
    try {
      const body = factorTipo === "email" ? { email: factor.trim() } : { telefono4: factor.replace(/\D/g, "").slice(-4) }
      setRes((await ecommercePostventaService.seguimiento(codigo.trim().toUpperCase(), body)).data)
    } catch {
      // 404 genérico del contrato: no revelar si el código existe.
      setError("No encontramos una solicitud con esos datos. Revisa el código y el dato de verificación e inténtalo de nuevo.")
    } finally {
      setBuscando(false)
    }
  }

  return (
    <>
      <form className="card" noValidate onSubmit={consultar}>
        <h2 style={{ fontSize: 18, lineHeight: "26px", margin: "0 0 4px" }}>Consultar seguimiento</h2>
        <p className="hint" style={{ margin: "0 0 16px" }}>Ingresa el código POS y el correo o los 4 últimos dígitos del teléfono con que registraste el caso.</p>
        <div style={{ display: "grid", gap: 16 }}>
          <Campo id="sg-codigo" label="Código de seguimiento">
            <input {...inputProps("sg-codigo")} placeholder="POS-AAAAMMDD-XXXXXXXXXX" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </Campo>
          <div className="fld">
            <i className="lbl" style={{ fontStyle: "normal" }}>Verificar con</i>
            <div role="radiogroup" aria-label="Verificar con" style={{ display: "grid", gap: 8, marginTop: 2 }}>
              <Opcion tipo="radio" nombre="factor" marcado={factorTipo === "email"} onCambio={() => setFactorTipo("email")} titulo="Correo registrado" />
              <Opcion tipo="radio" nombre="factor" marcado={factorTipo === "tel"} onCambio={() => setFactorTipo("tel")} titulo="4 últimos dígitos del teléfono" />
            </div>
          </div>
          <Campo id="sg-factor" label={factorTipo === "email" ? "Correo" : "4 últimos dígitos del teléfono"}>
            <input {...inputProps("sg-factor")} type={factorTipo === "email" ? "email" : "text"} inputMode={factorTipo === "tel" ? "numeric" : undefined}
              value={factor} onChange={(e) => setFactor(e.target.value)} />
          </Campo>
          <button className="btn btn-p" type="submit" disabled={buscando || !codigo.trim() || !factor.trim()}>
            <Search size={16} strokeWidth={1.75} className="pg-ic" aria-hidden />
            {buscando ? "Consultando…" : "Consultar"}
          </button>
        </div>
      </form>
      {error && <div style={{ marginTop: 16 }}><Alerta tono="bad" titulo="No encontramos esa solicitud" icono={<CircleX size={20} strokeWidth={1.75} className="pg-ic" aria-hidden />}><p>{error}</p></Alerta></div>}
      {res && <ResultadoSeguimiento d={res} />}
    </>
  )
}

// Resultado del seguimiento: datos clave + línea de tiempo vertical.
function ResultadoSeguimiento({ d }: { d: PostventaPublica }) {
  const linea = d.linea_tiempo ?? []
  const ultimo = linea.length - 1
  return (
    <section className="card" style={{ marginTop: 16 }} aria-live="polite">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px 12px", flexWrap: "wrap" }}>
        <div>
          <p className="hint" style={{ margin: 0 }}>Código de seguimiento</p>
          <b style={{ fontSize: 15, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>{d.codigo_seguimiento}</b>
        </div>
        <EstadoPostventa estado={d.estado} />
      </div>
      <dl className="dl c1" style={{ marginTop: 16 }}>
        <div><dt>Tipo</dt><dd>{TIPO_LABEL[d.tipo] ?? d.tipo}</dd></div>
        <div><dt>Producto o servicio</dt><dd>{d.producto_servicio}</dd></div>
        <div><dt>Registrada</dt><dd>{fmtFechaHora(d.fecha_creacion)}</dd></div>
        <div><dt>Última actualización</dt><dd>{fmtFechaHora(d.fecha_actualizacion)}</dd></div>
        <div>
          <dt>Respuesta de atención</dt>
          <dd style={{ fontWeight: 400, color: "var(--muted-foreground)" }}>{d.respuesta_cliente || "Aún no hay una respuesta publicada."}</dd>
        </div>
      </dl>
      {linea.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, lineHeight: "22px", margin: "20px 0 0" }}>Línea de tiempo</h3>
          <ol className="tl">
            {linea.map((paso, i) => {
              const e = ESTADOS[paso.estado] ?? { texto: paso.estado, tono: "neu" as const, icono: Circle }
              const Icono = e.icono
              return (
                <li key={`${paso.estado}-${i}`} className={i === ultimo ? "cur" : undefined}>
                  <i className="dot" style={{ fontStyle: "normal" }}><Icono size={14} strokeWidth={1.75} className="pg-ic" aria-hidden /></i>
                  <div>
                    <b>{e.texto}</b>
                    <i className="when" style={{ fontStyle: "normal" }}>{fmtFechaHora(paso.fecha)}</i>
                  </div>
                </li>
              )
            })}
          </ol>
        </>
      )}
    </section>
  )
}
