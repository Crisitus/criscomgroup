"use client"

// Libro de Reclamaciones (port criscom-ecom-contenido): una tarjeta plana con tres
// bloques numerados, indicador de pasos, errores por campo + resumen con anclas,
// y constancia al enviar (código LR- y fecha límite como lo más grande de la pantalla).
import { FormEvent, useState } from "react"
import Link from "next/link"
import {
  Circle, CircleAlert, CircleCheck, Clock, FileText, House, Mail, MailCheck, Printer,
  RotateCw, Send, ShieldCheck, Wrench,
} from "lucide-react"
import { ecommerceClaimService } from "@/services/ecommerceApi"
import { PageHead, Estado, Alerta } from "./contenidoShared"
import { Campo, Opcion, Honeypot } from "./Campos"

const SUB = "Registra una queja o reclamo relacionado con productos, servicios o atención de Criscom Group. Este canal no limita otras vías de solución de controversias."

type FormState = {
  nombre: string; email: string; telefono: string; documento: string; domicilio: string
  es_menor: boolean; apoderado: string
  tipo_bien: "producto" | "servicio"; bien: string; monto: string
  tipo: "reclamo" | "queja"; detalle: string; pedido: string; acepta_declaracion: boolean
}

const INICIAL: FormState = {
  nombre: "", email: "", telefono: "", documento: "", domicilio: "",
  es_menor: false, apoderado: "", tipo_bien: "producto", bien: "",
  monto: "", tipo: "reclamo", detalle: "", pedido: "", acepta_declaracion: false,
}

// La constancia muestra EXACTAMENTE lo que devuelve el 201 (contrato).
type Constancia = { codigo: string; fecha: string; fecha_vencimiento: string; correo?: string }

// Fechas civiles del backend (AAAA-MM-DD): se muestran tal cual, sin zona horaria.
const fmtCivil = (iso: string): string => {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || "")
}

// Anclas del resumen de errores: campo del backend -> id del control.
const IDS: Record<string, string> = {
  nombre: "lr-nombre", documento: "lr-documento", email: "lr-email", telefono: "lr-telefono",
  domicilio: "lr-domicilio", apoderado: "lr-apoderado", bien: "lr-bien", monto: "lr-monto",
  detalle: "lr-detalle", pedido: "lr-pedido", acepta_declaracion: "lr-decl",
}

const BLOQUES: string[][] = [
  ["nombre", "documento", "email", "telefono", "domicilio", "es_menor", "apoderado"],
  ["tipo_bien", "bien", "monto"],
  ["tipo", "detalle", "pedido", "acepta_declaracion"],
]
const NOMBRE_BLOQUE = ["Identificación", "Bien contratado", "Detalle"]

const inputProps = (id: string, err?: string) =>
  ({ id, className: "inp", ...(err ? { "aria-invalid": true as const, "aria-describedby": `${id}-m` } : {}) })

export default function LibroPage() {
  const [form, setForm] = useState<FormState>(INICIAL)
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState("")
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [intento, setIntento] = useState(false)
  const [website, setWebsite] = useState("")
  const [constancia, setConstancia] = useState<Constancia | null>(null)
  const [apagado, setApagado] = useState("")

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setMensaje(""); setErrores({}); setIntento(true)
    setEnviando(true)
    try {
      const res = await ecommerceClaimService.create({
        nombre: form.nombre, email: form.email, telefono: form.telefono || undefined,
        documento: form.documento, domicilio: form.domicilio,
        es_menor: form.es_menor, apoderado: form.es_menor ? form.apoderado : undefined,
        tipo_bien: form.tipo_bien, bien: form.bien,
        monto: form.monto ? Number(form.monto) : undefined,
        tipo: form.tipo, detalle: form.detalle, pedido: form.pedido,
        acepta_declaracion: true,
        ...(website ? { website } : {}),
      } as Parameters<typeof ecommerceClaimService.create>[0])
      // El servicio tipa {codigo, fecha}; el 201 también trae fecha_vencimiento y correo.
      const d = res.data as unknown as Constancia
      setConstancia({ codigo: d.codigo, fecha: d.fecha, fecha_vencimiento: d.fecha_vencimiento, correo: d.correo })
      setForm(INICIAL)
      window.scrollTo({ top: 0, behavior: "instant" })
    } catch (err) {
      const res = (err as { response?: { status?: number; data?: { message?: string; errores?: Record<string, string> } } })?.response
      if (res?.status === 503) {
        // Módulo apagado por flag: canales alternos con el mensaje del servidor.
        setApagado(res.data?.message || "El Libro de reclamaciones virtual no está disponible por el momento.")
      } else {
        setErrores(res?.data?.errores ?? {})
        setMensaje(res?.data?.message || "No pudimos registrar la hoja. Intenta nuevamente o comunícate con nosotros.")
        window.scrollTo({ top: 0, behavior: "instant" })
      }
    } finally {
      setEnviando(false)
    }
  }

  if (constancia) return <ConstanciaView c={constancia} onOtra={() => setConstancia(null)} />
  if (apagado) return <ModuloApagado mensaje={apagado} onReintentar={() => setApagado("")} />

  const nErr = Object.keys(errores).length
  const pasoEstado = BLOQUES.map((campos) => {
    if (campos.some((c) => errores[c])) return "bad"
    return intento ? "ok" : "pend"
  }) as ("bad" | "ok" | "pend")[]

  return (
    <div className="pg-contenido"><div className="wrap">
      <PageHead titulo="Libro de reclamaciones" sub={SUB} />
      <div className="two lr">
        <form className="card" noValidate onSubmit={submit}>
          {nErr > 0 && (
            <Alerta tono="bad" titulo={`Revisa ${nErr} ${nErr === 1 ? "campo" : "campos"} antes de registrar`}>
              <p>La hoja no se envió. {mensaje}</p>
              <ul>
                {Object.entries(errores).map(([campo, msg]) => (
                  <li key={campo}><a href={`#${IDS[campo] || "lr-nombre"}`}>{msg}</a></li>
                ))}
              </ul>
            </Alerta>
          )}
          {nErr === 0 && mensaje && (
            <Alerta tono="warn" titulo="No se pudo registrar"><p>{mensaje}</p></Alerta>
          )}
          <ol className="steps" aria-label="Avance del formulario">
            {NOMBRE_BLOQUE.map((n, i) => {
              const e = pasoEstado[i]
              const Icono = e === "ok" ? CircleCheck : e === "bad" ? CircleAlert : Circle
              return (
                <li key={n} className={e === "pend" ? undefined : e}>
                  <Icono size={16} strokeWidth={1.75} className="pg-ic" aria-hidden />
                  {i + 1}. {n} · {e === "ok" ? "Completo" : e === "bad" ? "Con errores" : "Pendiente"}
                </li>
              )
            })}
          </ol>
          <section className="blk">
            <div className="bh"><i className="blknum" style={{ fontStyle: "normal" }}>1</i><h2>Identificación del consumidor</h2></div>
            <div className="grid2">
              <Campo id="lr-nombre" label="Nombre completo" error={errores.nombre}>
                <input {...inputProps("lr-nombre", errores.nombre)} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} autoComplete="name" />
              </Campo>
              <Campo id="lr-documento" label="Documento (DNI, CE o RUC)" error={errores.documento} hint="DNI: 8 dígitos · CE: 9 letras o números · RUC: 11 dígitos">
                <input {...inputProps("lr-documento", errores.documento)} value={form.documento} onChange={(e) => set("documento", e.target.value)} inputMode="numeric" />
              </Campo>
              <Campo id="lr-email" label="Correo electrónico" error={errores.email}>
                <input {...inputProps("lr-email", errores.email)} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
              </Campo>
              <Campo id="lr-telefono" label="Teléfono" opcional error={errores.telefono} hint="Solo dígitos, + - ( ) y espacios.">
                <input {...inputProps("lr-telefono", errores.telefono)} type="tel" value={form.telefono} onChange={(e) => set("telefono", e.target.value)} autoComplete="tel" />
              </Campo>
              <div className="s2">
                <Campo id="lr-domicilio" label="Domicilio" error={errores.domicilio}>
                  <input {...inputProps("lr-domicilio", errores.domicilio)} value={form.domicilio} onChange={(e) => set("domicilio", e.target.value)} autoComplete="street-address" />
                </Campo>
              </div>
              <div className="s2">
                <Opcion tipo="checkbox" nombre="es_menor" marcado={form.es_menor} onCambio={(v) => set("es_menor", v)}
                  titulo="El consumidor es menor de edad" detalle="Si marcas esta casilla, pediremos los datos del apoderado." />
              </div>
              {form.es_menor && (
                <div className="s2">
                  <Campo id="lr-apoderado" label="Nombre del apoderado" error={errores.apoderado}>
                    <input {...inputProps("lr-apoderado", errores.apoderado)} value={form.apoderado} onChange={(e) => set("apoderado", e.target.value)} />
                  </Campo>
                </div>
              )}
            </div>
          </section>

          <section className="blk">
            <div className="bh"><i className="blknum" style={{ fontStyle: "normal" }}>2</i><h2>Bien contratado</h2></div>
            <div className="grid2">
              <div className="s2">
                <i className="lbl" style={{ fontStyle: "normal" }}>Tipo de bien</i>
                <div className="grid2" role="radiogroup" aria-label="Tipo de bien" style={{ marginTop: 6 }}>
                  <Opcion tipo="radio" nombre="tipo_bien" marcado={form.tipo_bien === "producto"} onCambio={() => set("tipo_bien", "producto")} titulo="Producto" />
                  <Opcion tipo="radio" nombre="tipo_bien" marcado={form.tipo_bien === "servicio"} onCambio={() => set("tipo_bien", "servicio")} titulo="Servicio" />
                </div>
              </div>
              <Campo id="lr-bien" label="Descripción del producto o servicio" error={errores.bien}>
                <input {...inputProps("lr-bien", errores.bien)} value={form.bien} onChange={(e) => set("bien", e.target.value)} />
              </Campo>
              <Campo id="lr-monto" label="Monto reclamado" opcional error={errores.monto} hint="Hasta 2 decimales.">
                <div className="pre">
                  <b>S/</b>
                  <input {...inputProps("lr-monto", errores.monto)} inputMode="decimal" placeholder="0.00" value={form.monto} onChange={(e) => set("monto", e.target.value)} />
                </div>
              </Campo>
            </div>
          </section>
          <section className="blk">
            <div className="bh"><i className="blknum" style={{ fontStyle: "normal" }}>3</i><h2>Detalle</h2></div>
            <div className="grid2">
              <div className="s2">
                <i className="lbl" style={{ fontStyle: "normal" }}>Tipo de hoja</i>
                <div className="grid2" role="radiogroup" aria-label="Tipo de hoja" style={{ marginTop: 6 }}>
                  <Opcion tipo="radio" nombre="tipo" marcado={form.tipo === "reclamo"} onCambio={() => set("tipo", "reclamo")}
                    titulo="Reclamo" detalle="Disconformidad con el producto o servicio." />
                  <Opcion tipo="radio" nombre="tipo" marcado={form.tipo === "queja"} onCambio={() => set("tipo", "queja")}
                    titulo="Queja" detalle="Malestar con la atención, no con el bien." />
                </div>
              </div>
              <div className="s2">
                <Campo id="lr-detalle" label="Describe los hechos" error={errores.detalle}
                  hint={`Entre 20 y 4000 caracteres · ${form.detalle.length} / 4000`}>
                  <textarea {...inputProps("lr-detalle", errores.detalle)} rows={5} value={form.detalle} onChange={(e) => set("detalle", e.target.value)} />
                </Campo>
              </div>
              <div className="s2">
                <Campo id="lr-pedido" label="¿Qué solución solicitas?" error={errores.pedido} hint="Entre 5 y 1000 caracteres.">
                  <textarea {...inputProps("lr-pedido", errores.pedido)} rows={3} value={form.pedido} onChange={(e) => set("pedido", e.target.value)} />
                </Campo>
              </div>
              <div className="s2">
                <div id="lr-decl">
                  <Opcion tipo="checkbox" nombre="acepta_declaracion" marcado={form.acepta_declaracion}
                    onCambio={(v) => set("acepta_declaracion", v)} invalida={!!errores.acepta_declaracion}
                    titulo="Declaro que la información es verdadera y autorizo su tratamiento para atender esta hoja conforme a la política de privacidad." />
                </div>
                {errores.acepta_declaracion && (
                  <i className="err" style={{ fontStyle: "normal", marginTop: 6 }}>
                    <CircleAlert size={14} strokeWidth={1.75} className="pg-ic" aria-hidden />
                    {errores.acepta_declaracion}
                  </i>
                )}
                <Link className="lk" href="/privacidad">
                  <ShieldCheck size={16} strokeWidth={1.75} className="pg-ic" aria-hidden />
                  Leer la política de privacidad
                </Link>
              </div>
            </div>
          </section>

          <Honeypot valor={website} onCambio={setWebsite} />
          <div className="sbar">
            <button className="btn btn-p" type="submit" disabled={enviando}>
              <Send size={16} strokeWidth={1.75} className="pg-ic" aria-hidden />
              {enviando ? "Registrando…" : "Registrar hoja de reclamación"}
            </button>
            <small className="hint">Al registrar recibes una constancia con código y fecha límite de respuesta.</small>
          </div>
        </form>

        <aside className="card aside stk">
          <h2>Qué pasa al registrar</h2>
          <ul>
            <li><FileText size={16} strokeWidth={1.75} className="pg-ic" aria-hidden /><div><b>Constancia inmediata.</b> Recibes un código LR- para ubicar tu hoja.</div></li>
            <li><Clock size={16} strokeWidth={1.75} className="pg-ic" aria-hidden /><div><b>Respuesta en 15 días hábiles.</b> Te mostramos la fecha límite exacta.</div></li>
            <li><Mail size={16} strokeWidth={1.75} className="pg-ic" aria-hidden /><div><b>Aviso por correo</b> con los datos de tu constancia.</div></li>
          </ul>
        </aside>
      </div>
    </div></div>
  )
}

// Constancia: código LR- y fecha límite son lo más grande de la pantalla.
function ConstanciaView({ c, onOtra }: { c: Constancia; onOtra: () => void }) {
  const correo = c.correo === "enviado"
    ? <Estado tono="ok" texto="Enviado" icono={MailCheck} />
    : c.correo === "error"
      ? <Estado tono="warn" texto="No se pudo enviar" icono={CircleAlert} />
      : <Estado tono="neu" texto="Omitido" icono={Mail} />

  const imprimir = () => {
    document.body.classList.add("pr-contenido")
    window.print()
    document.body.classList.remove("pr-contenido")
  }

  return (
    <div className="pg-contenido"><div className="wrap">
      <PageHead titulo="Libro de reclamaciones" sub="Tu hoja quedó registrada." />
      <section className="card narrow" aria-live="polite">
        <div className="ok-h"><Estado tono="ok" texto="Hoja registrada" /></div>
        <p className="hint" style={{ margin: 0 }}>Código de tu hoja de reclamación</p>
        <div className="big">{c.codigo}</div>
        <div className="due">
          <small>Te respondemos a más tardar el</small>
          {fmtCivil(c.fecha_vencimiento)}
        </div>
        <dl className="dl">
          <div><dt>Fecha de registro</dt><dd>{fmtCivil(c.fecha)}</dd></div>
          <div><dt>Plazo de respuesta</dt><dd>15 días hábiles</dd></div>
          <div><dt>Aviso por correo</dt><dd>{correo}</dd></div>
        </dl>
        <div className="acts">
          <button className="btn btn-p" type="button" onClick={imprimir}>
            <Printer size={16} strokeWidth={1.75} className="pg-ic" aria-hidden />
            Imprimir constancia
          </button>
          <button className="btn btn-s" type="button" onClick={onOtra}>
            Registrar otra hoja
          </button>
          <Link className="btn btn-s" href="/">
            <House size={16} strokeWidth={1.75} className="pg-ic" aria-hidden />
            Volver al inicio
          </Link>
        </div>
      </section>
    </div></div>
  )
}

// 503: módulo apagado por flag; canales alternos con el mensaje del servidor.
function ModuloApagado({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <div className="pg-contenido"><div className="wrap">
      <PageHead titulo="Libro de reclamaciones" sub={SUB} />
      <section className="card narrow" role="alert">
        <div className="ok-h"><Estado tono="warn" texto="Módulo no disponible" icono={Wrench} /></div>
        <p style={{ margin: "0 0 6px", fontWeight: 650 }}>El Libro de reclamaciones virtual no está disponible por el momento.</p>
        <p style={{ margin: 0, color: "var(--muted-foreground)", fontSize: 14, lineHeight: "21px" }}>{mensaje}</p>
        <div className="acts">
          <button className="btn btn-p" type="button" onClick={onReintentar}>
            <RotateCw size={16} strokeWidth={1.75} className="pg-ic" aria-hidden />
            Reintentar
          </button>
          <Link className="btn btn-s" href="/">
            <House size={16} strokeWidth={1.75} className="pg-ic" aria-hidden />
            Volver al inicio
          </Link>
        </div>
      </section>
    </div></div>
  )
}
