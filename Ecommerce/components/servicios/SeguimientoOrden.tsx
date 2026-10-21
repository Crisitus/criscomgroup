"use client"

// /servicio-tecnico/seguimiento: consulta de la orden por su token privado
// (GET /api/ecommerce/servicio-tecnico/seguimiento/:token). En claro u oscuro
// con tokens; 404, error de red, cargando y vacio son estados distintos.
import React, { useEffect, useState } from "react"
import { Loader2, MessageCircle, RefreshCcw, Search, SearchX } from "lucide-react"
import { buildWhatsAppUrl, getConfigPublica } from "@/services/configPublicaService"
import { AlertaAviso, Field } from "./serviciosShared"
import SeguimientoResultado, { type Orden } from "./SeguimientoResultado"
import "@/styles/servicios.css"

type Fase = "form" | "cargando" | "ok" | "404" | "red"

const Skeleton = () => (
  <div aria-busy="true">
    <p className="note" role="status" style={{ marginBottom: 16 }}>
      <Loader2 size={16} className="ic spin" aria-hidden />
      <span>Buscando tu orden…</span>
    </p>
    <section className="card">
      <div className="sk" style={{ height: 20, width: 120 }} />
      <div className="sk" style={{ height: 32, width: 260, marginTop: 12 }} />
      <div className="sk" style={{ height: 20, width: 200, marginTop: 12 }} />
      <div className="sk" style={{ height: 48, marginTop: 20 }} />
    </section>
    <div className="cols2" style={{ marginTop: 16 }}>
      <section className="card">
        <div className="sk" style={{ height: 20, width: 90, marginBottom: 16 }} />
        <div className="sk" style={{ height: 18, marginBottom: 12 }} />
        <div className="sk" style={{ height: 18, marginBottom: 12 }} />
        <div className="sk" style={{ height: 18 }} />
      </section>
      <section className="card">
        <div className="sk" style={{ height: 20, width: 110, marginBottom: 16 }} />
        <div className="sk" style={{ aspectRatio: "4 / 3" }} />
      </section>
    </div>
  </div>
)

const SeguimientoOrden = () => {
  const [token, setToken] = useState("")
  const [fase, setFase] = useState<Fase>("form")
  const [orden, setOrden] = useState<Orden | null>(null)
  const [errCampo, setErrCampo] = useState("")
  const [waUrl, setWaUrl] = useState<string | null>(null)

  useEffect(() => {
    getConfigPublica().then((cfg) =>
      setWaUrl(buildWhatsAppUrl(cfg, "Hola, no logro consultar mi orden de servicio con mi token de seguimiento.")))
  }, [])

  const consultar = async (valor = token) => {
    const limpio = valor.trim()
    if (!limpio) {
      setErrCampo("Pega tu token de seguimiento.")
      return
    }
    setErrCampo("")
    setFase("cargando")
    setOrden(null)
    try {
      const res = await fetch(
        `/api/ecommerce/servicio-tecnico/seguimiento/${encodeURIComponent(limpio)}`,
        { cache: "no-store" },
      )
      if (res.status === 404) {
        setErrCampo("El token no corresponde a ninguna orden.")
        setFase("404")
        return
      }
      if (!res.ok) throw new Error(String(res.status))
      setOrden((await res.json()) as Orden)
      setFase("ok")
    } catch {
      setFase("red")
    }
  }

  // Deep link: ?codigo= (heredado) o ?token= consultan de inmediato.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const inicial = params.get("codigo") || params.get("token") || ""
    if (inicial) {
      setToken(inicial)
      void consultar(inicial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <form
        className="card"
        noValidate
        aria-label="Consulta de orden por token"
        onSubmit={(e) => { e.preventDefault(); void consultar() }}
      >
        <div className="row">
          <Field
            name="token"
            label="Token de seguimiento"
            span={12}
            value={token}
            onChange={(x) => { setToken(x); if (errCampo) setErrCampo("") }}
            placeholder="Pega el token de tu enlace"
            maxLength={120}
            error={errCampo}
          />
          <button type="submit" className="btn" aria-busy={fase === "cargando" || undefined} aria-disabled={fase === "cargando" || undefined}>
            {fase === "cargando" ? <Loader2 size={18} className="ic spin" aria-hidden /> : <Search size={18} className="ic" aria-hidden />}
            <span>{fase === "cargando" ? "Consultando…" : "Consultar"}</span>
          </button>
        </div>
      </form>
      {fase === "cargando" && <Skeleton />}
      {fase === "red" && (
        <AlertaAviso
          icono="wifi"
          titulo="Sin conexión con el servidor"
          acts={
            <button type="button" className="btn out" onClick={() => void consultar()}>
              <RefreshCcw size={18} className="ic" aria-hidden />
              <span>Reintentar</span>
            </button>
          }
        >
          No pudimos consultar tu orden. Eso no significa que no exista: revisa tu conexión e inténtalo de nuevo.
        </AlertaAviso>
      )}
      {fase === "404" && (
        <section className="card big" role="alert">
          <span className="ei"><SearchX size={22} className="ic" aria-hidden /></span>
          <h2>No encontramos esa orden</h2>
          <p className="mut">
            Revisa que el token esté completo, tal como llegó en tu enlace.
            {waUrl ? " Si el problema sigue, escríbenos por WhatsApp." : " Si el problema sigue, contáctanos."}
          </p>
          <div className="acts">
            <button type="button" className="btn" onClick={() => { setFase("form"); setErrCampo("") }}>
              <RefreshCcw size={18} className="ic" aria-hidden />
              <span>Reintentar</span>
            </button>
            {waUrl && (
              <a className="btn out" href={waUrl} target="_blank" rel="noreferrer">
                <MessageCircle size={18} className="ic" aria-hidden />
                <span>WhatsApp</span>
              </a>
            )}
          </div>
        </section>
      )}
      {fase === "ok" && orden && <SeguimientoResultado orden={orden} />}
    </>
  )
}

export default SeguimientoOrden
