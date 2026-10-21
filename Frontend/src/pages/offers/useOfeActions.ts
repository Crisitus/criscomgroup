import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  createOrUpdateOffer, deleteOffer, deleteOffersBulk, getApiErrorMessage,
  type OfferBatchResponse, type OfferInput, type OfferItemState,
} from "../../services/offerService"
import { ARROW, SEP, calc, fp, money, plu, r2, type Mode, type OfeRow } from "./ofeCalc"

export interface ResItem { id: number; estado: OfferItemState; motivo: string | null; txt?: string }
export interface Result {
  kind: "apply" | "quit"
  ok: boolean
  /** Mensaje de error de red/servidor cuando no hay detalle por producto */
  fatal?: string
  message?: string
  items: ResItem[]
  ids: number[]
}

const PRICE_RE = /^\d*\.?\d{0,2}$/

export function useOfeActions(rows: OfeRow[], refresh: () => void) {
  const [sel, setSel] = useState<number[]>([])
  const [mode, setMode] = useState<Mode>("pct")
  const [pct, setPctRaw] = useState(20)
  const [fix, setFix] = useState<Record<number, string>>({})
  const [result, setResult] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  const byId = useMemo(() => new Map(rows.map(r => [r.id, r])), [rows])
  const selRows = useMemo(() => sel.map(id => byId.get(id)).filter((r): r is OfeRow => !!r), [sel, byId])

  const toggle = (id: number) => setSel(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))
  const setMany = (ids: number[], on: boolean) =>
    setSel(s => (on ? Array.from(new Set([...s, ...ids])) : s.filter(x => !ids.includes(x))))
  const clear = () => setSel([])
  const setPct = (n: number) => setPctRaw(Math.min(99, Math.max(1, Math.round(n) || 1)))
  const setPrice = (id: number, v: string) => { if (PRICE_RE.test(v)) setFix(f => ({ ...f, [id]: v })) }
  const blurPrice = (id: number) => setFix(f => {
    const v = f[id]
    if (!v) return f
    const n = Number(v)
    return Number.isFinite(n) ? { ...f, [id]: r2(n).toFixed(2) } : f
  })

  const names = (res: OfferBatchResponse) =>
    res.resultados.filter(r => r.estado !== "aplicada").slice(0, 3)
      .map(r => `${byId.get(r.id_producto)?.p.nombre || `#${r.id_producto}`}: ${r.motivo || r.estado}`).join(" | ")

  const apply = async (ids: number[]): Promise<boolean> => {
    const items: OfferInput[] = []
    for (const id of ids) {
      const r = byId.get(id)
      if (!r || calc(r, mode, pct, fix).err) return false
      items.push(mode === "fix" ? { id_producto: id, precio_fijo: r2(Number(fix[id])) } : { id_producto: id, descuento: pct })
    }
    if (!items.length) return false
    setBusy(true)
    try {
      const res = await createOrUpdateOffer(items)
      const out: ResItem[] = res.resultados.map(x => {
        const r = byId.get(x.id_producto)
        const txt = x.estado === "aplicada" && r && x.precio_oferta_con_igv !== undefined
          ? `${money(r.normal)} ${ARROW} ${money(x.precio_oferta_con_igv)}${SEP}−${fp(x.descuento ?? 0).replace("−", "")}` : undefined
        return { id: x.id_producto, estado: x.estado, motivo: x.motivo, txt }
      })
      setResult({ kind: "apply", ok: !!res.success, message: res.message, items: out, ids })
      if (res.success) {
        const n = res.procesadas.length
        toast.success(n === 1 ? "Oferta aplicada correctamente" : `${n} ofertas aplicadas correctamente`)
        setSel(s => s.filter(x => !ids.includes(x)))
        setFix(f => Object.fromEntries(Object.entries(f).filter(([k]) => !ids.includes(Number(k)))))
      } else toast.error("No se aplicó ninguna oferta: revisa el detalle por producto.")
      refresh()
      return !!res.success
    } catch (e) {
      const msg = getApiErrorMessage(e, "Error al aplicar la oferta")
      setResult({ kind: "apply", ok: false, fatal: msg, items: [], ids })
      toast.error(msg)
      return false
    } finally { setBusy(false) }
  }

  /** Quita ofertas: uno solo usa DELETE; varios usan eliminar-lote con resultado por producto. */
  const remove = async (ids: number[]): Promise<boolean> => {
    setBusy(true)
    try {
      if (ids.length === 1) {
        const res = await deleteOffer(ids[0])
        refresh()
        if (res.success) { toast.success("Oferta eliminada correctamente"); setSel(s => s.filter(x => x !== ids[0])) }
        else toast.error(res.message || names(res) || "No se pudo eliminar la oferta")
        return !!res.success
      }
      const res = await deleteOffersBulk(ids)
      const out: ResItem[] = res.resultados.map(x => {
        const r = byId.get(x.id_producto)
        return { id: x.id_producto, estado: x.estado, motivo: x.motivo, txt: x.estado === "aplicada" && r ? `Oferta quitada${SEP}vuelve a ${money(r.normal)}` : undefined }
      })
      setResult({ kind: "quit", ok: !!res.success, message: res.message, items: out, ids })
      const done = res.procesadas.length
      if (res.success) toast.success(`Se eliminaron ${done} ofertas correctamente`)
      else if (done > 0) toast.warning(`Se eliminaron ${plu(done, "oferta", "ofertas")}; fallaron ${res.errores.length}. ${names(res)}`)
      else toast.error(`No se eliminó ninguna oferta. ${names(res)}`)
      setSel(s => s.filter(x => !res.procesadas.includes(x)))
      refresh()
      return done > 0
    } catch (e) {
      const msg = getApiErrorMessage(e, "Error al eliminar las ofertas")
      if (ids.length > 1) setResult({ kind: "quit", ok: false, fatal: msg, items: [], ids })
      toast.error(msg)
      return false
    } finally { setBusy(false) }
  }

  return {
    sel, selRows, mode, setMode, pct, setPct, fix, setPrice, blurPrice, result, setResult, busy,
    toggle, setMany, clear, apply, remove, byId,
  }
}
export type Acts = ReturnType<typeof useOfeActions>
