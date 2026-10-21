import type { PaymentGateway } from "../../../services/paymentGatewayService"
import type { PagFichaCtl } from "./usePagFicha"

/** Texto del porqué una acción no está disponible (siempre escrito, nunca solo `title`). */
export function probarWhy(gw: PaymentGateway | undefined, c: PagFichaCtl) {
  if (!gw) return "Guarda las llaves primero."
  if (c.cred) return "Ingresa de nuevo las llaves y guárdalas primero."
  if (c.dirty) return "Guarda los cambios primero: la prueba usa las llaves guardadas."
  return ""
}
