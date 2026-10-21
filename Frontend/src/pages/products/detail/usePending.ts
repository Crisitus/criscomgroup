import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import type { Code } from "./types"
import { intOf } from "./shared"

export interface TmpRow { codigo: string; cantidad: string }

export interface PendingState {
  tmp: TmpRow[]
  del: number[]
  qty: Record<number, string>
  file: File | null
  preview: string | null
  removeImg: boolean
}

const EMPTY: PendingState = { tmp: [], del: [], qty: {}, file: null, preview: null, removeImg: false }

/** Cambios que quedan pendientes hasta pulsar Guardar: codigos, cantidades e imagen. */
export function usePending() {
  const [p, setP] = useState<PendingState>(EMPTY)
  const reset = useCallback(() => setP(EMPTY), [])

  useEffect(() => () => { if (p.preview) URL.revokeObjectURL(p.preview) }, [p.preview])

  const addTmp = (codigo: string, cantidad: number) => setP(s => ({ ...s, tmp: [...s.tmp, { codigo, cantidad: String(cantidad) }] }))
  const setTmpQty = (codigo: string, v: string) => setP(s => ({ ...s, tmp: s.tmp.map(t => (t.codigo === codigo ? { ...t, cantidad: v } : t)) }))
  const dropTmp = (codigo: string) => setP(s => ({ ...s, tmp: s.tmp.filter(t => t.codigo !== codigo) }))
  const toggleDel = (id: number) => setP(s => ({ ...s, del: s.del.includes(id) ? s.del.filter(x => x !== id) : [...s.del, id] }))
  const setQty = (id: number, v: string) => setP(s => ({ ...s, qty: { ...s.qty, [id]: v } }))

  const pickImage = (file: File | undefined) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return void toast.error("La imagen no puede pesar más de 5 MB")
    if (!file.type.startsWith("image/")) return void toast.error("Solo se permiten archivos de imagen")
    setP(s => ({ ...s, file, preview: URL.createObjectURL(file), removeImg: false }))
  }
  /** Quita la imagen elegida; si no hay elegida y el producto tiene una guardada, la marca para quitar. */
  const clearImage = (hasSaved: boolean) =>
    setP(s => ({ ...s, file: null, preview: null, removeImg: s.file ? false : hasSaved }))
  const undoRemoveImage = () => setP(s => ({ ...s, removeImg: false }))

  return { p, reset, addTmp, setTmpQty, dropTmp, toggleDel, setQty, pickImage, clearImage, undoRemoveImage }
}

export type Pending = ReturnType<typeof usePending>

/** Resumen derivado de los codigos guardados + pendientes. */
export interface CodeModel {
  saved: Code[]
  usa: boolean
  suma: number
  count: number
  qtyChanged: Code[]
  badQty: boolean
  dirty: boolean
}

export const qtyOf = (c: Code, p: PendingState) => (p.qty[c.id] !== undefined ? p.qty[c.id] : String(c.cantidad))

export function codeModel(saved: Code[], p: PendingState): CodeModel {
  const live = saved.filter(c => !p.del.includes(c.id))
  let badQty = false
  let suma = 0
  const qtyChanged: Code[] = []
  for (const c of live) {
    const v = intOf(qtyOf(c, p))
    if (Number.isNaN(v) || v < 1) badQty = true
    else suma += v
    if (p.qty[c.id] !== undefined && v !== c.cantidad) qtyChanged.push(c)
  }
  for (const t of p.tmp) {
    const v = intOf(t.cantidad)
    if (Number.isNaN(v) || v < 1) badQty = true
    else suma += v
  }
  const dirty = p.tmp.length > 0 || p.del.length > 0 || qtyChanged.length > 0 || !!p.file || p.removeImg
  return { saved, usa: saved.length > 0 || p.tmp.length > 0, suma, count: live.length + p.tmp.length, qtyChanged, badQty, dirty }
}
