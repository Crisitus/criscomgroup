import { useState } from "react"
import { useAuth } from "../../../contexts/AuthContext"
import { apiFailure } from "../../../services/companyService"
import { getLogDetail, getLogs, type AuditChange } from "../../../services/auditLogService"
import { useBlock } from "./usePagBlock"

export type AuditTab = "pas" | "pos"
export type Detail = { status: "load" | "ok" | "error"; cambios: AuditChange[]; message: string }
export const TABLA: Record<AuditTab, string> = { pas: "pasarelas_pago", pos: "pos_adquirentes" }

/** Ver quién cambió qué exige rol 1/5, superusuario temporal o el área «auditoria». */
export function usePagAudit() {
  const { user } = useAuth()
  const allowed = Boolean(user && ([1, 5].includes(user.id_role ?? 0) || user.superusuario_temporal || user.area_grants?.includes("auditoria")))
  const blk = useBlock(async () => {
    const [pas, pos] = await Promise.all([getLogs({ tabla: TABLA.pas, limit: 10 }), getLogs({ tabla: TABLA.pos, limit: 10 })])
    return { pas, pos }
  }, allowed)
  const [tab, setTab] = useState<AuditTab>("pas")
  const [open, setOpen] = useState<number | null>(null)
  const [details, setDetails] = useState<Record<number, Detail>>({})

  const toggle = async (id: number) => {
    if (open === id) { setOpen(null); return }
    setOpen(id)
    if (details[id]?.status === "ok") return
    setDetails(d => ({ ...d, [id]: { status: "load", cambios: [], message: "" } }))
    try {
      const data = await getLogDetail(id)
      setDetails(d => ({ ...d, [id]: { status: "ok", cambios: (data.cambios ?? []) as AuditChange[], message: "" } }))
    } catch (error: unknown) {
      setDetails(d => ({ ...d, [id]: { status: "error", cambios: [], message: apiFailure(error, "No se pudo leer el detalle").message } }))
    }
  }
  const page = blk.data ? blk.data[tab] : null
  return { allowed, blk, tab, setTab: (t: AuditTab) => { setTab(t); setOpen(null) }, open, toggle, details, rows: page?.rows ?? [], totals: { pas: blk.data?.pas.total ?? 0, pos: blk.data?.pos.total ?? 0 } }
}
export type PagAuditCtl = ReturnType<typeof usePagAudit>
