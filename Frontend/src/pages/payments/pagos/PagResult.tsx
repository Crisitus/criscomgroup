import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { CircleCheck, CircleX, Clock, Info, RefreshCw, TriangleAlert, WifiOff } from "lucide-react"
import type { PaymentGateway } from "../../../services/paymentGatewayService"
import type { PagFichaCtl } from "./usePagFicha"
import { Btn, I, Stat } from "./pagCommon"
import { NB, ST, fdate } from "./pagData"

type Look = { tone: "ok" | "bad" | "warn" | ""; icon: LucideIcon; title: string; when?: string; lines: ReactNode[]; extra?: ReactNode }

/** Resultado persistente de la última acción (no es un toast): el 422 y el 502 son inconfundibles. */
export function PagResult({ gw, c }: { gw?: PaymentGateway; c: PagFichaCtl }) {
  const r = c.result
  const look = ((): Look => {
    if (r?.kind === "saved") return { tone: "ok", icon: CircleCheck, title: "Guardado", when: fdate(r.at), lines: [<>Culqi quedó en «Guardado, falta probar» y <b>sin uso</b> en la tienda web. Pruébala y vuelve a activarla para que los cobros web la usen de nuevo.</>] }
    if (r?.kind === "nochange") return { tone: "", icon: Info, title: "Sin cambios", lines: ["Las llaves y el entorno son los mismos que ya estaban guardados. No se modificó nada y Culqi sigue en el mismo estado."] }
    if (r?.kind === "transient") {
      const prev = gw ? `Culqi sigue «${ST[gw.connection_status]?.[2] ?? gw.connection_status}»${gw.en_uso ? " y En uso" : ""}${gw.last_checked_at ? `, como en la última prueba (${fdate(gw.last_checked_at)})` : ""}.` : ""
      return {
        tone: "warn", icon: WifiOff, title: "No se pudo contactar a la pasarela", when: `Intento: ${fdate(r.at)}`,
        lines: [(r.message ?? "").replace(/^No se pudo contactar a la pasarela\.?\s*/, "") || "Tu configuración no se modificó; vuelve a intentarlo.", <>No fue un rechazo de las llaves: fue un fallo de red o una respuesta temporal de Culqi (404, 429 o 5xx). <b>No se desactivó nada.</b> {prev}</>, ...(r.detail ? [`Detalle: ${r.detail}`] : [])],
        extra: <Btn out busy={c.busy === "test"} onClick={() => void c.test()} icon={I(RefreshCw)} od="reintentar-prueba">Reintentar prueba</Btn>,
      }
    }
    if (r?.kind === "fail") return { tone: "bad", icon: TriangleAlert, title: "No se pudo completar la acción", when: fdate(r.at), lines: [r.message ?? "Inténtalo de nuevo."] }
    if (r?.kind === "cred" || c.cred) return { tone: "bad", icon: TriangleAlert, title: "No se pueden descifrar las llaves guardadas", lines: ["Vuelve a ingresar la llave pública y la secreta y guarda. Mientras tanto no se puede probar ni usar Culqi."] }
    if (!gw) return { tone: "", icon: Info, title: "Sin pruebas todavía", lines: ["Guarda las llaves y prueba la conexión. La prueba no cobra."] }
    if (gw.connection_status === "saved") return { tone: "", icon: Clock, title: "Aún no se ha probado", lines: ["Culqi no se usará en la tienda web hasta que la pruebes y la actives. La prueba no cobra."] }
    if (gw.connection_status === "connected") return { tone: "ok", icon: CircleCheck, title: "Conexión correcta", when: fdate(gw.last_checked_at), lines: [`«${gw.connection_message ?? "Conexión validada."}»`, "La prueba no cobra: solo consulta 1 cargo en modo lectura."] }
    if (gw.connection_status === "error") return {
      tone: "bad", icon: CircleX, title: "Error de conexión", when: fdate(gw.last_checked_at),
      lines: [`La pasarela rechazó las credenciales (respuesta 400, 401 o 403): «${gw.connection_message ?? "sin detalle"}».`, <><b>Culqi se desactivó:</b> ya no se usa en la tienda web. Revisa las llaves, guárdalas y vuelve a probar.</>],
      extra: <Stat k="sinuso" text="Desactivada" />,
    }
    return { tone: "warn", icon: Clock, title: ST[gw.connection_status]?.[2] ?? gw.connection_status, lines: [gw.connection_message ?? ""] }
  })()
  const Icon = look.icon
  return (
    <div className={`pa-res${look.tone ? ` pa-${look.tone}` : ""}`} role="status" aria-live="polite">
      {I(Icon, 20)}
      <div className="pa-bd">
        <h3>{look.title}{look.when && <span className="pa-when pa-num">{look.when.replace(" ", NB)}</span>}</h3>
        {look.lines.map((l, i) => <p key={i}>{l}</p>)}
        {look.extra && <div className="pa-r">{look.extra}</div>}
      </div>
    </div>
  )
}
