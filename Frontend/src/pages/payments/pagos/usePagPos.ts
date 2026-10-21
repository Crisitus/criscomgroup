import { useState } from "react"
import { apiFailure } from "../../../services/companyService"
import { listAdquirentesPos, updateAdquirentePos, type AdquirentePos } from "../../../services/posService"
import { useBlock } from "./usePagBlock"

/** Adquirentes del POS: solo el principal registra pagos nuevos (hacer principal apaga al anterior). */
export function usePagPos() {
  const blk = useBlock(() => listAdquirentesPos(true))
  const [busy, setBusy] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [confirm, setConfirm] = useState<number | null>(null)

  const run = async (a: AdquirentePos, body: Partial<AdquirentePos>, fallback: string) => {
    if (busy != null) return
    setBusy(a.id_adquirente); setErrors({})
    try { await updateAdquirentePos(a.id_adquirente, body); setConfirm(null); await blk.reload() }
    catch (error: unknown) { setErrors({ [a.id_adquirente]: apiFailure(error, fallback).message }) }
    finally { setBusy(null) }
  }
  const makeMain = (a: AdquirentePos) => run(a, { predeterminado: true, activo: true }, "No se pudo cambiar el adquirente principal")
  const toggle = (a: AdquirentePos) => run(a, { activo: !a.activo }, "No se pudo cambiar el estado del adquirente")
  const rows = blk.data ?? []
  const main = rows.find(a => a.predeterminado && a.activo) ?? null
  return { blk, rows, main, busy, errors, confirm, setConfirm, makeMain, toggle }
}
export type PagPosCtl = ReturnType<typeof usePagPos>
