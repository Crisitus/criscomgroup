import { useId, useState } from "react"
import { CircleCheck, CircleDashed, CircleX, Copy, Database, Info, KeyRound, Server, TriangleAlert } from "lucide-react"
import type { PaymentGateway } from "../../../services/paymentGatewayService"
import type { PagFichaCtl } from "./usePagFicha"
import { I } from "./pagCommon"
import { SOURCE } from "./pagData"

const LABEL: Record<string, string> = { public_key: "Llave pública", secret_key: "Llave secreta", private_key: "Llave privada", merchant_id: "ID de comercio" }
const SRC_ICON = { ninguna: KeyRound, pasarela: Database, servidor: Server } as const

export function EnvBlock({ c }: { c: PagFichaCtl }) {
  const id = useId()
  const opts: [string, string][] = [["test", "Pruebas"], ["production", "Producción"]]
  return (
    <div>
      <div className="pa-sl" id={`${id}e`}>Entorno</div>
      <div className="pa-opts" role="radiogroup" aria-labelledby={`${id}e`}>
        {opts.map(([v, t]) => <button key={v} type="button" className="pa-opt" role="radio" aria-checked={c.env === v} onClick={() => c.setEnv(v as "test" | "production")}>{t}</button>)}
      </div>
      <p className="pa-hint">
        {c.env === "test" ? <>{I(Info)}Llaves pk_test_ y sk_test_.</> : <>{I(TriangleAlert)}Cobros reales, con llaves pk_live_ y sk_live_.{c.toProd ? " Al guardar te pediremos escribir PRODUCCIÓN." : ""}</>}
      </p>
    </div>
  )
}

/** `kept` = hay llaves guardadas en esta pantalla que la tienda web todavía no usa. */
export function OriginBlock({ source, kept }: { source: string | null; kept: boolean }) {
  const key = (source ?? "ninguna") as keyof typeof SRC_ICON
  const base = source ? (SOURCE[source] ?? [source, ""]) : ["No se pudo leer el origen", "No se pudo consultar con qué llaves cobra la tienda web."]
  const [title, desc] = source === "ninguna" && kept ? ["Sin llaves en uso", "Hay llaves guardadas aquí, pero la tienda web todavía no las usa: pruébalas y actívalas."] : base
  return (
    <div>
      <div className="pa-sl">Origen de las llaves</div>
      <div className="pa-org">{I(SRC_ICON[key] ?? KeyRound, 18)}<div><b>{title}</b><span>{desc}</span></div></div>
    </div>
  )
}

export function KeyField({ field, c, gw }: { field: string; c: PagFichaCtl; gw?: PaymentGateway }) {
  const id = useId()
  const err = c.errors[field]
  const configured = Boolean(gw?.configured_fields?.[field])
  const ph = c.cred ? "Vuelve a ingresar la llave" : configured ? "Se conservará la llave guardada" : `${field === "public_key" ? "pk" : "sk"}_${c.env === "production" ? "live" : "test"}_…`
  return (
    <div>
      <label className="pa-sl" htmlFor={id}>
        {LABEL[field] ?? field}
        {c.cred ? <span className="pa-st pa-warn">{I(TriangleAlert, 14)}No se puede descifrar</span>
          : configured ? <span className="pa-st pa-ok">{I(CircleCheck, 14)}Configurada</span>
          : <span className="pa-st pa-neu">{I(CircleDashed, 14)}Sin configurar</span>}
      </label>
      <input id={id} className={`pa-in${err ? " pa-err" : ""}`} type="password" autoComplete="new-password" spellCheck={false} data-1p-ignore="true"
        value={c.keys[field] ?? ""} placeholder={ph} onChange={e => c.setKey(field, e.target.value)}
        aria-invalid={err ? true : undefined} aria-describedby={err ? `${id}e` : undefined} />
      {err && <p className="pa-why pa-bad" id={`${id}e`}>{I(CircleX)}{err}</p>}
    </div>
  )
}

export function WebhookBlock({ url }: { url: string }) {
  const id = useId()
  const [done, setDone] = useState<"ok" | "no" | null>(null)
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setDone("ok") } catch { setDone("no") }
    window.setTimeout(() => setDone(null), 3000)
  }
  return (
    <div>
      <label className="pa-sl" htmlFor={id}>Webhook de Culqi · solo lectura</label>
      <div className="pa-wh">
        <input id={id} className="pa-in pa-mono" readOnly value={url} />
        <button type="button" className="pa-btn pa-out" onClick={() => void copy()}>{I(Copy)}{done === "ok" ? "Copiado" : "Copiar"}</button>
      </div>
      {done === "no" && <p className="pa-hint">{I(Info)}No se pudo copiar automáticamente: selecciona el texto y cópialo.</p>}
    </div>
  )
}
