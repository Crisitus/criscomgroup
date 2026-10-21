"use client"

// /seguimiento (port criscom-ecom-cuenta): página unificada. Un campo de código;
// el front elige el endpoint por prefijo (SOL- importación, ARM- ensamble,
// WEB- servicio, otro = pedido CG-). El segundo factor (correo o 4 dígitos del
// teléfono) se oculta para pedidos. 404 genérico (no revela si el código existe).
import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import axios from "axios"
import { ArrowLeft, CircleAlert, TriangleAlert, ShieldCheck, Clock } from "lucide-react"
import {
  ecommerceImportService, ecommerceEnsambleService, ecommerceAuthService,
} from "@/services/ecommerceApi"
import { orderService } from "@/services/orderService"
import { getMisSolicitudes, trackServicioToken } from "./cuentaApi"
import { Al, Field, Cargando } from "./CuentaBits"
import { detectarTipo, leerFactor } from "./cuentaShared"
import { ResultadoView, type Resultado, type PedidoSeg } from "./SeguimientoResultado"

type ErrorConsulta =
  | { tipo: "404" }
  | { tipo: "400" }
  | { tipo: "429" }
  | { tipo: "otro"; texto: string }

const SeguimientoPanel = () => {
  const searchParams = useSearchParams()
  const [codigo, setCodigo] = useState("")
  const [factorTexto, setFactorTexto] = useState("")
  const [errorCodigo, setErrorCodigo] = useState<string | undefined>()
  const [errorFactor, setErrorFactor] = useState<string | undefined>()
  const [errorTop, setErrorTop] = useState<ErrorConsulta | null>(null)
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [token, setToken] = useState("")
  const [tokenLoading, setTokenLoading] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const tipo = detectarTipo(codigo)
  const pideFactor = tipo !== "pedido" && codigo.trim() !== ""

  const limpiarErrores = () => {
    setErrorCodigo(undefined)
    setErrorFactor(undefined)
    setErrorTop(null)
  }

  const mapearError = (e: unknown): ErrorConsulta => {
    const status = axios.isAxiosError(e) ? e.response?.status : undefined
    if (status === 404) return { tipo: "404" }
    if (status === 400) return { tipo: "400" }
    if (status === 429) return { tipo: "429" }
    if (axios.isAxiosError(e) && e.response) {
      return { tipo: "otro", texto: "No pudimos consultar el código. Intenta de nuevo en unos minutos." }
    }
    return { tipo: "otro", texto: "Error al conectar con el servidor" }
  }

  const consultar = useCallback(async (codigoParam?: string) => {
    const cod = (codigoParam ?? codigo).trim()
    limpiarErrores()
    if (!cod) {
      setErrorCodigo("Ingresa tu código de seguimiento.")
      return
    }
    const tipoCod = detectarTipo(cod)
    let factor: ReturnType<typeof leerFactor> = null
    if (tipoCod !== "pedido") {
      factor = leerFactor(factorTexto)
      if (!factor) {
        setErrorFactor("Falta este dato: ingresa tu correo o los últimos 4 dígitos de tu teléfono.")
        setErrorTop({ tipo: "400" })
        return
      }
    }
    setLoading(true)
    setResultado(null)
    try {
      if (tipoCod === "pedido") {
        const res = await orderService.trackOrder(cod)
        setResultado({ kind: "pedido", data: res.pedido as PedidoSeg })
      } else if (tipoCod === "importacion") {
        const res = await ecommerceImportService.seguimiento(cod, factor ?? {})
        if (res.success && res.data) setResultado({ kind: "importacion", data: res.data })
        else setErrorTop({ tipo: "404" })
      } else if (tipoCod === "ensamble") {
        const res = await ecommerceEnsambleService.seguimiento(cod, factor ?? {})
        if (res.success && res.data) setResultado({ kind: "ensamble", data: res.data })
        else setErrorTop({ tipo: "404" })
      } else {
        // WEB-: estado simple desde mis-solicitudes (si hay sesión) + token opcional.
        let estado: string | null = null
        if (ecommerceAuthService.isAuthenticated()) {
          try {
            const ms = await getMisSolicitudes(1, 50)
            const propia = ms.data.find(
              (s) => s.tipo === "servicio" && s.codigo.toUpperCase() === cod.toUpperCase(),
            )
            estado = propia?.estado ?? null
          } catch {
            estado = null
          }
        }
        setResultado({ kind: "servicio", codigo: cod, estado, detalle: null })
      }
    } catch (e) {
      setErrorTop(mapearError(e))
    } finally {
      setLoading(false)
    }
  }, [codigo, factorTexto])

  // Código prellenado (desde Mis pedidos / Mis solicitudes o el redirect con código).
  // El pedido no pide factor: se consulta directo; el resto espera el factor.
  useEffect(() => {
    document.title = "Seguimiento · Criscom Group"
    const c = searchParams.get("codigo")
    if (c) {
      setCodigo(c)
      if (detectarTipo(c) === "pedido") void consultar(c)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const consultarToken = async () => {
    const t = token.trim()
    if (!t || resultado?.kind !== "servicio") return
    setTokenError(null)
    setTokenLoading(true)
    try {
      const detalle = await trackServicioToken(t)
      setResultado({ kind: "servicio", codigo: resultado.codigo, estado: resultado.estado, detalle })
    } catch (e) {
      const status = axios.isAxiosError(e) ? e.response?.status : undefined
      setTokenError(status === 404
        ? "No encontramos una orden con ese token. Revísalo e inténtalo de nuevo."
        : "No pudimos consultar la orden. Intenta de nuevo en unos minutos.")
    } finally {
      setTokenLoading(false)
    }
  }

  const otroCodigo = () => {
    setResultado(null)
    setCodigo("")
    setFactorTexto("")
    setToken("")
    setTokenError(null)
    limpiarErrores()
  }

  return (
    <>
      <div className="ph">
        <h1>Seguimiento</h1>
        {resultado && (
          <button className="btn o" type="button" onClick={otroCodigo}>
            <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
            Consultar otro código
          </button>
        )}
      </div>
      {!resultado && (
        <form
          className="card fc sg"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void consultar()
          }}
        >
          {errorTop?.tipo === "404" && (
            <Al tono="r" icon={CircleAlert}>
              <strong>No encontramos resultados.</strong> Revisa el código y el dato de
              confirmación, e inténtalo de nuevo.
            </Al>
          )}
          {errorTop?.tipo === "400" && (
            <Al tono="r" icon={CircleAlert}>
              <strong>Falta un dato para consultar.</strong> Completa el campo marcado.
            </Al>
          )}
          {errorTop?.tipo === "429" && (
            <Al tono="a" icon={Clock}>
              <strong>Límite de consultas alcanzado.</strong> Espera unos minutos e inténtalo de nuevo.
            </Al>
          )}
          {errorTop?.tipo === "otro" && (
            <Al tono="r" icon={TriangleAlert}>
              {errorTop.texto}
            </Al>
          )}
          <Field
            id="seg-cod"
            label="Código de seguimiento"
            value={codigo}
            onChange={setCodigo}
            placeholder="SOL-…, ARM-…, WEB-… o CG-…"
            error={errorCodigo}
            hint={errorCodigo
              ? undefined
              : "Empieza con SOL- (importación), ARM- (ensamble), WEB- (servicio técnico) o CG- (pedido). Los pedidos no piden confirmación."}
          />
          {pideFactor && (
            <Field
              id="seg-fac"
              label="Correo o últimos 4 dígitos del teléfono"
              value={factorTexto}
              onChange={setFactorTexto}
              placeholder="tucorreo@ejemplo.com o 4567"
              autoComplete="email"
              error={errorFactor}
              hint={errorFactor
                ? undefined
                : "Por privacidad, confirma tu correo o los últimos 4 dígitos de tu teléfono."}
            />
          )}
          {pideFactor && !errorFactor && (
            <p className="hint" style={{ margin: 0 }}>
              <ShieldCheck size={14} strokeWidth={1.75} aria-hidden />
              Tus datos solo se usan para confirmar que la solicitud es tuya.
            </p>
          )}
          <button className="btn p w" type="submit" disabled={loading}>
            {loading ? "Consultando…" : "Consultar seguimiento"}
          </button>
        </form>
      )}
      {loading && <Cargando texto="Consultando tu código…" filas={2} />}
      {resultado && (
        <ResultadoView
          resultado={resultado}
          token={token}
          onToken={setToken}
          onConsultarToken={consultarToken}
          tokenLoading={tokenLoading}
          tokenError={tokenError}
        />
      )}
    </>
  )
}

export default SeguimientoPanel
