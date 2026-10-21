import { useState } from "react"
import { apiFailure } from "../../../services/companyService"
import { clearDefaultPaymentGateway, savePaymentGateway, setDefaultPaymentGateway, testPaymentGateway, type GatewayCatalogItem, type PaymentGateway } from "../../../services/paymentGatewayService"

export type Env = "test" | "production"
export type FichaResult = { kind: "saved" | "nochange" | "transient" | "cred" | "fail"; at: Date; message?: string; detail?: string }
type Busy = "save" | "test" | "use" | "stop" | null

const prefix = (field: string, env: Env) => (field === "public_key" ? "pk" : field === "secret_key" ? "sk" : "") + (env === "production" ? "_live_" : "_test_")
const keyLabel = (field: string) => (field === "public_key" ? "La llave pública" : "La llave secreta")

/** Borrador y acciones de la ficha de una pasarela integrada (hoy Culqi). Las llaves nunca se leen de vuelta. */
export function usePagFicha(item: GatewayCatalogItem | undefined, gw: PaymentGateway | undefined, reloadAll: () => Promise<void>) {
  const fields = item?.fields ?? []
  const [env, setEnvState] = useState<Env | null>(null)
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<Busy>(null)
  const [result, setResult] = useState<FichaResult | null>(null)
  const [prodOpen, setProdOpen] = useState(false)
  const [prodMsg, setProdMsg] = useState("")
  const [confirmStop, setConfirmStop] = useState(false)

  const saved = gw?.mode ?? "test"
  const shownEnv: Env = env ?? saved
  const cred = Boolean(gw?.credentials_error)
  const typed = fields.some(f => (keys[f] ?? "").trim())
  const dirty = typed || shownEnv !== saved
  const toProd = shownEnv === "production" && saved !== "production"

  const setEnv = (v: Env) => { setEnvState(v === saved ? null : v); setErrors({}) }
  const setKey = (field: string, v: string) => { setKeys(k => ({ ...k, [field]: v })); setErrors(e => ({ ...e, [field]: "" })) }
  const stamp = (r: Omit<FichaResult, "at">) => setResult({ ...r, at: new Date() })

  const validate = () => {
    const out: Record<string, string> = {}
    for (const f of fields) {
      const v = (keys[f] ?? "").trim()
      const stored = Boolean(gw?.configured_fields?.[f]) && !cred
      if (!v && !stored) out[f] = "Requerido"
      else if (v && item?.provider === "culqi" && !v.startsWith(prefix(f, shownEnv))) out[f] = `${keyLabel(f)} debe empezar con ${prefix(f, shownEnv)} en ${shownEnv === "production" ? "producción" : "el entorno de pruebas"}.`
    }
    return out
  }

  const save = async (confirmation?: string) => {
    if (!item || busy) return
    const bad = validate()
    if (Object.keys(bad).length) { setErrors(bad); setProdOpen(false); return }
    setBusy("save"); setErrors({}); setProdMsg("")
    try {
      const credentials = Object.fromEntries(fields.filter(f => (keys[f] ?? "").trim()).map(f => [f, keys[f].trim()]))
      const out = await savePaymentGateway(item.provider, { mode: shownEnv, credentials, ...(confirmation ? { confirmar_produccion: confirmation } : {}) })
      setKeys({}); setEnvState(null); setProdOpen(false); setConfirmStop(false)
      stamp({ kind: out.sinCambios ? "nochange" : "saved" })
      await reloadAll()
    } catch (error: unknown) {
      const f = apiFailure(error, "No se pudieron guardar los cambios")
      if (f.status === 409 && f.extra.requiere_confirmacion) { if (confirmation) setProdMsg(f.message); setProdOpen(true) }
      else if (f.status === 409 && f.extra.credentials_error) { setProdOpen(false); stamp({ kind: "cred" }); await reloadAll() }
      else if (f.status === 422 && Object.keys(f.errores).length) { setProdOpen(false); setErrors(f.errores) }
      else { setProdOpen(false); stamp({ kind: "fail", message: f.message }) }
    } finally { setBusy(null) }
  }

  const test = async () => {
    if (!item || busy) return
    setBusy("test"); setConfirmStop(false)
    try { await testPaymentGateway(item.provider); setResult(null); await reloadAll() }
    catch (error: unknown) {
      const f = apiFailure(error, "No se pudo probar la conexión")
      if (f.status === 502) stamp({ kind: "transient", message: f.message, detail: typeof f.extra.detail === "string" ? f.extra.detail : undefined })
      else if (f.status === 422) { setResult(null); await reloadAll() }
      else if (f.status === 409) { stamp({ kind: "cred" }); await reloadAll() }
      else stamp({ kind: "fail", message: f.message })
    } finally { setBusy(null) }
  }

  const toggleUse = async (on: boolean) => {
    if (!item || busy) return
    setBusy(on ? "use" : "stop")
    try {
      await (on ? setDefaultPaymentGateway : clearDefaultPaymentGateway)(item.provider)
      setResult(null); setConfirmStop(false); await reloadAll()
    } catch (error: unknown) { stamp({ kind: "fail", message: apiFailure(error, on ? "No se pudo activar la pasarela" : "No se pudo dejar de usar la pasarela").message }) }
    finally { setBusy(null) }
  }

  return { fields, env: shownEnv, setEnv, keys, setKey, errors, busy, dirty, toProd, cred, result, prodOpen, setProdOpen, prodMsg, confirmStop, setConfirmStop, save, test, toggleUse }
}
export type PagFichaCtl = ReturnType<typeof usePagFicha>
