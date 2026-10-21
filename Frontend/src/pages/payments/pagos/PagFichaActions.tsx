import { useId } from "react"
import { Info, Lock, Power, Zap } from "lucide-react"
import type { PaymentGateway } from "../../../services/paymentGatewayService"
import type { PagFichaCtl } from "./usePagFicha"
import { probarWhy } from "./pagWhy"
import { Btn, I } from "./pagCommon"
import { fdate } from "./pagData"

export function ProbarBlock({ gw, c }: { gw?: PaymentGateway; c: PagFichaCtl }) {
  const id = useId()
  const why = probarWhy(gw, c)
  return (
    <div>
      <Btn out dis={Boolean(why)} by={`${id}p`} busy={c.busy === "test"} onClick={() => void c.test()} icon={I(Zap)} od="probar">{c.busy === "test" ? "Probando…" : "Probar conexión"}</Btn>
      <p className="pa-eff" id={`${id}p`}>{why ? <>{I(Lock)}{why}</> : <>{I(Info)}Consulta 1 cargo en modo lectura con las llaves guardadas. No cobra.</>}</p>
    </div>
  )
}

export function UsarBlock({ gw, c }: { gw?: PaymentGateway; c: PagFichaCtl }) {
  const id = useId()
  if (gw?.en_uso && !c.cred) {
    return (
      <div>
        <Btn out icon={I(Power)} onClick={() => c.setConfirmStop(true)} busy={c.busy === "stop"} od="dejar-de-usar">Dejar de usar</Btn>
        {c.confirmStop
          ? <div className="pa-cf" role="group" aria-label="Confirmar dejar de usar">
              <p><b>¿Dejar de usar Culqi?</b> La tienda web dejará de dirigir los cobros a Culqi. Las llaves guardadas y la conexión probada se conservan: podrás volver a usarla con un clic.</p>
              <div className="pa-r"><Btn busy={c.busy === "stop"} onClick={() => void c.toggleUse(false)}>Sí, dejar de usar</Btn><Btn out onClick={() => c.setConfirmStop(false)}>Cancelar</Btn></div>
            </div>
          : <p className="pa-eff">{I(Info)}Los cobros web dejan de usar Culqi. Las llaves guardadas se conservan.</p>}
      </div>
    )
  }
  const ok = gw?.connection_status === "connected" && !c.dirty && !c.cred
  const why = !gw ? "Guarda las llaves y prueba la conexión primero."
    : c.cred ? "Primero vuelve a ingresar las llaves."
    : c.dirty ? "Hay cambios sin guardar: guárdalos y vuelve a probar."
    : gw.connection_status === "saved" ? "Prueba la conexión primero: solo se puede usar una pasarela conectada."
    : gw.connection_status === "error" ? "Culqi rechazó las llaves y quedó desactivada. Corrígelas, guárdalas y vuelve a probar."
    : "Prueba la conexión primero: solo se puede usar una pasarela conectada."
  return (
    <div>
      <Btn dis={!ok} by={`${id}u`} busy={c.busy === "use"} onClick={() => void c.toggleUse(true)} od="usar">{c.busy === "use" ? "Activando…" : "Usar en los cobros web"}</Btn>
      <p className="pa-eff" id={`${id}u`}>{ok ? <>{I(Info)}Los cobros web usarán las llaves guardadas en la base de datos ({gw?.mode === "production" ? "Producción" : "Pruebas"}). Última prueba: {fdate(gw?.last_checked_at)}.</> : <>{I(Lock)}{why}</>}</p>
    </div>
  )
}
