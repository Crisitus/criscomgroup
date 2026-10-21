import { useState } from "react"
import { apiFailure } from "../../../services/companyService"
import { bloquearRuc20, setEmisorPredeterminado, updateEmisor, type EmisorSunat } from "../../../services/facturacionService"

export type EditVals = { razon_social: string; direccion: string; serie_factura: string; serie_boleta: string }
export type EditState = { id: number; vals: EditVals; errs: Record<string, string>; summary: string; busy: boolean }
export type SeriesAsk = { id: number; vals: EditVals; comprobantes: number }
export type Notice = { text: string; afectados?: number }

const FIELDS: (keyof EditVals)[] = ["razon_social", "direccion", "serie_factura", "serie_boleta"]

/** Acciones sobre emisores: editar series (con confirmación 409), predeterminado y bloqueo RUC 20. */
export function useSunEmitters(reload: () => Promise<void>) {
  const [edit, setEdit] = useState<EditState | null>(null)
  const [ask, setAsk] = useState<SeriesAsk | null>(null)
  const [confirmDef, setConfirmDef] = useState<number | null>(null)
  const [defBusy, setDefBusy] = useState(false)
  const [defErr, setDefErr] = useState<{ id: number; message: string } | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [blockAsk, setBlockAsk] = useState(false)
  const [blockBusy, setBlockBusy] = useState(false)
  const [blockErr, setBlockErr] = useState("")

  const startEdit = (e: EmisorSunat) => {
    if (!e.id_company) return
    setConfirmDef(null); setDefErr(null); setNotice(null)
    setEdit({ id: e.id_company, busy: false, errs: {}, summary: "", vals: { razon_social: e.razon_social, direccion: e.direccion || "", serie_factura: e.serie_factura, serie_boleta: e.serie_boleta } })
  }
  const setField = (k: keyof EditVals, v: string) => setEdit(s => s && ({ ...s, vals: { ...s.vals, [k]: k.startsWith("serie") ? v.toUpperCase() : v }, errs: { ...s.errs, [k]: "" } }))

  const save = async (confirm = false, vals?: EditVals) => {
    if (!edit) return
    const v = vals ?? edit.vals
    setEdit(s => s && ({ ...s, busy: true, errs: {}, summary: "" }))
    try {
      await updateEmisor(edit.id, { ...v, ...(confirm ? { confirmar_cambio_series: true } : {}) })
      setAsk(null); setEdit(null)
      setNotice({ text: "Cambios guardados. Este emisor quedó habilitado y predeterminado." })
      await reload()
    } catch (error) {
      const f = apiFailure(error, "No se pudo guardar la configuración fiscal")
      if (f.status === 409 && f.extra.requiere_confirmacion) {
        setAsk({ id: edit.id, vals: v, comprobantes: Number(f.extra.comprobantes_emitidos) || 0 })
        setEdit(s => s && ({ ...s, busy: false }))
        return
      }
      setAsk(null)
      const errs: Record<string, string> = {}
      FIELDS.forEach(k => { if (f.errores[k]) errs[k] = f.errores[k] })
      setEdit(s => s && ({ ...s, busy: false, errs, summary: Object.keys(errs).length ? "" : f.message }))
    }
  }

  const askDefault = (id: number) => { setEdit(null); setDefErr(null); setNotice(null); setConfirmDef(id) }
  const doDefault = async () => {
    if (confirmDef === null) return
    setDefBusy(true)
    try {
      await setEmisorPredeterminado(confirmDef)
      setConfirmDef(null); setNotice({ text: "Emisor predeterminado actualizado." })
      await reload()
    } catch (error) {
      setDefErr({ id: confirmDef, message: apiFailure(error, "No se pudo cambiar el emisor predeterminado").message })
      setConfirmDef(null)
    } finally { setDefBusy(false) }
  }

  const doBlock = async () => {
    setBlockBusy(true); setBlockErr("")
    try {
      const { afectados } = await bloquearRuc20()
      setBlockAsk(false); setNotice({ text: "RUC 20 bloqueado. Empresas afectadas: ", afectados })
      await reload()
    } catch (error) { setBlockErr(apiFailure(error, "No se pudo bloquear RUC 20").message) }
    finally { setBlockBusy(false) }
  }

  return {
    edit, ask, confirmDef, defBusy, defErr, notice, blockAsk, blockBusy, blockErr,
    startEdit, setField, save, cancelEdit: () => setEdit(null), closeAsk: () => setAsk(null),
    askDefault, cancelDefault: () => setConfirmDef(null), doDefault,
    openBlock: () => { setBlockErr(""); setBlockAsk(true) }, closeBlock: () => { if (!blockBusy) setBlockAsk(false) }, doBlock,
    closeNotice: () => setNotice(null),
  }
}
