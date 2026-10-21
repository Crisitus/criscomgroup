import { useCallback, useEffect, useRef, useState } from "react"
import { fetchUserBasicInfo } from "../../../services/userService"
import { getAffiliates } from "../../../services/affiliateService"
import { httpStatus, limaMs, serverMsg } from "./usrCommon"

export interface AffPayment { id_affiliate_payment: number; monto: string; metodo: string; referencia: string; estado: "pendiente" | "validado" | "rechazado"; creado_en: string }
export interface AffSettlement {
  id_settlement: number; periodo: string; facturacion_valida: string; monto_comision: string; vence_en: string
  estado: "pendiente" | "vencido" | "pagado" | "anulado"; periodo_cerrado?: boolean; payments: AffPayment[]
}
export interface AffBusiness {
  id_affiliate_business: number; owner_user_id: number; nombre_comercial: string; estado: "activo" | "suspendido" | "cerrado"
  comision_porcentaje: string; prueba_inicia_en: string | null; prueba_finaliza_en: string | null; settlements: AffSettlement[]
  summary: { ventas: number; neto: number; unidades_stock: number; valor_stock: number; compras: number; cotizaciones: number; servicios: number }
}
export type AffState = "load" | "ok" | "error" | "forbidden" | "unauth"

/** Negocios afiliados con sus liquidaciones y el nombre de cada dueño. */
export function useUsrAffiliates() {
  const [data, setData] = useState<AffBusiness[]>([])
  const [owners, setOwners] = useState<Record<number, string>>({})
  const [state, setState] = useState<AffState>("load")
  const [msg, setMsg] = useState("")
  const seq = useRef(0)

  const load = useCallback(async () => {
    const id = ++seq.current
    setState(s => (s === "ok" ? s : "load"))
    try {
      const list = (await getAffiliates()) as AffBusiness[]
      if (id !== seq.current) return
      setData(list); setState("ok"); setMsg("")
      const res = await Promise.allSettled(list.map(b => fetchUserBasicInfo(b.owner_user_id)))
      if (id !== seq.current) return
      const map: Record<number, string> = {}
      res.forEach((r, i) => { if (r.status === "fulfilled") map[list[i].owner_user_id] = r.value.name })
      setOwners(map)
    } catch (e) {
      if (id !== seq.current) return
      const c = httpStatus(e)
      setMsg(serverMsg(e, "No se pudieron cargar los negocios afiliados")); setState(c === 403 ? "forbidden" : c === 401 ? "unauth" : "error")
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const owner = (b: AffBusiness) => owners[b.owner_user_id] ?? `Cuenta #${b.owner_user_id}`
  /** Próxima liquidación por vencer (pendiente con vencimiento más cercano). */
  const proxima = (b: AffBusiness) => b.settlements.filter(s => s.estado === "pendiente" || s.estado === "vencido").sort((a, c) => a.vence_en.localeCompare(c.vence_en))[0]
  const porVencer = data.filter(b => { const p = proxima(b); return !!p && limaMs(p.vence_en) < Date.now() + 3 * 864e5 }).length
  return { data, state, msg, load, owner, proxima, porVencer, byId: (id?: number | null) => data.find(b => b.id_affiliate_business === id) }
}
