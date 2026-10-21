import { Database, KeyRound, Server } from "lucide-react"
import type { PagGatewayCtl } from "./usePagGateway"
import { I, Stat } from "./pagCommon"
import { Clock } from "lucide-react"

const WEB: Record<string, string> = { ninguna: "Sin llaves en uso", pasarela: "Con llaves de la base de datos", servidor: "Con llaves del servidor" }
const ICON = { ninguna: KeyRound, pasarela: Database, servidor: Server }

/** Respuesta de una línea a «¿con qué cobra la tienda web hoy?». Lee del mismo estado que la ficha. */
export function PagBand({ g }: { g: PagGatewayCtl }) {
  if (g.web.status === "load" && g.integ.status === "load") return <section className="pa-card pa-band" aria-busy="true" aria-label="Cargando estado de los cobros"><span className="pa-sk" style={{ width: "60%" }} /></section>
  const src = g.source
  const known = src != null
  const mode = g.gw?.mode ?? (g.sourceMode === "production" ? "production" : "test")
  const Icon = ICON[(src as keyof typeof ICON) ?? "ninguna"] ?? KeyRound
  return (
    <section className="pa-card pa-band" aria-label="Con qué cobra la tienda web hoy">
      <span className="pa-bi">{I(known ? Icon : Clock)}Cobros web: <b>{known ? (src === "ninguna" && !g.gw ? "Sin llaves" : WEB[src as string] ?? src) : g.integ.status === "load" ? "Consultando…" : "No se pudo leer el origen"}</b></span>
      <span className="pa-bi">Entorno: <b>{mode === "production" ? "Producción" : "Pruebas"}</b></span>
      <span className="pa-bi">En uso: {g.gw?.en_uso ? <Stat k="uso" text="Sí" /> : <Stat k="sinuso" text="No" />}</span>
    </section>
  )
}
