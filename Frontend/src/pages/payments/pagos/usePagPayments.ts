import { useMemo, useState } from "react"
import { listWebPayments, type WebPayment } from "../../../services/paymentGatewayService"
import { listPagosPos, type PagoPos } from "../../../services/posService"
import { useBlock } from "./usePagBlock"

export type PosPay = PagoPos & { venta_id?: number }
const byDate = <T extends { creado_en: string }>(a: T, b: T) => (a.creado_en < b.creado_en ? 1 : a.creado_en > b.creado_en ? -1 : 0)
const count = <T extends { estado: string }>(rows: T[], estado: string) => rows.filter(r => r.estado === estado).length

/** Pagos recientes, solo lectura: aquí no se cobra, no se confirma ni se anula nada. */
export function usePagPayments() {
  const web = useBlock(listWebPayments)
  const fis = useBlock(listPagosPos)
  const [tab, setTab] = useState<"web" | "fis">("web")
  const [all, setAll] = useState<{ web: boolean; fis: boolean }>({ web: false, fis: false })
  const webRows = useMemo<WebPayment[]>(() => [...(web.data ?? [])].sort(byDate), [web.data])
  const fisRows = useMemo<PosPay[]>(() => [...((fis.data ?? []) as PosPay[])].sort(byDate), [fis.data])
  const sum = {
    web: { creado: count(webRows, "creado"), pagado: count(webRows, "pagado"), otros: webRows.length - count(webRows, "creado") - count(webRows, "pagado") },
    fis: { pend: count(fisRows, "pendiente_confirmacion"), conf: count(fisRows, "confirmado"), otros: fisRows.length - count(fisRows, "pendiente_confirmacion") - count(fisRows, "confirmado") },
  }
  return { web, fis, webRows, fisRows, tab, setTab, all, toggleAll: (k: "web" | "fis") => setAll(a => ({ ...a, [k]: !a[k] })), sum }
}
export type PagPaymentsCtl = ReturnType<typeof usePagPayments>
