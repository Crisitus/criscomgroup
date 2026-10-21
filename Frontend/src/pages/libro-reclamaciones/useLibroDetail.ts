import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { getReclamacion, mensajeError, updateReclamacion, type EstadoReclamacion, type Reclamacion } from "../../services/libroReclamacionesService"
import { estadoHttp } from "./libroCommon"

export type DetStatus = "idle" | "load" | "ok" | "error" | "forbidden" | "notfound"
export type Banner = { k: "enviado" | "omitido" | "error" | "c409" } | { k: "fallo"; msg: string }
type Out = { ok: true; res: Reclamacion } | { ok: false; code: number; msg: string; campos?: Record<string, string> }

/** Detalle de una hoja + borradores de respuesta por hoja + acciones de estado (PUT {estado, respuesta}). */
export function useLibroDetail(id: number | null, onChanged: () => void) {
  const [det, setDet] = useState<Reclamacion | null>(null)
  const [status, setStatus] = useState<DetStatus>("idle")
  const [banner, setBanner] = useState<Banner | null>(null)
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [fieldErr, setFieldErr] = useState("")
  const [busy, setBusy] = useState<"proc" | "send" | "arc" | null>(null)
  const [dlgErr, setDlgErr] = useState("")
  const seq = useRef(0)

  const load = useCallback(async (quiet = false) => {
    if (id == null) { setDet(null); setStatus("idle"); return }
    const n = ++seq.current
    if (!quiet) setStatus("load")
    try {
      const r = await getReclamacion(id)
      if (n !== seq.current) return
      setDet(r); setStatus("ok")
    } catch (error) {
      if (n !== seq.current) return
      const c = estadoHttp(error)
      if (!quiet) setDet(null)
      setStatus(c === 403 ? "forbidden" : c === 404 ? "notfound" : "error")
    }
  }, [id])
  useEffect(() => { setBanner(null); setFieldErr(""); setDlgErr(""); void load() }, [load])

  const draft = id != null ? drafts[id] ?? "" : ""
  const setDraft = (v: string) => { if (id != null) { setDrafts(p => ({ ...p, [id]: v })); setFieldErr("") } }

  const put = async (estado: EstadoReclamacion, respuesta?: string): Promise<Out> => {
    if (id == null) return { ok: false, code: 0, msg: "" }
    try {
      const res = await updateReclamacion(id, respuesta === undefined ? { estado } : { estado, respuesta })
      return { ok: true, res }
    } catch (error) {
      const data = (error as { response?: { data?: { errores?: Record<string, string> } } })?.response?.data
      return { ok: false, code: estadoHttp(error), msg: mensajeError(error, "No se pudo guardar el cambio"), campos: data?.errores }
    }
  }
  const apply = (res: Reclamacion) => { setDet(p => (p ? { ...p, ...res } : res)); void load(true); onChanged() }
  const conflict = () => { setBanner({ k: "c409" }); void onChanged() }

  const proc = async () => {
    setBusy("proc"); setBanner(null)
    const o = await put("en_proceso")
    setBusy(null)
    if (o.ok) { apply(o.res); toast.success("La hoja pasó a En proceso") }
    else if (o.code === 409) conflict()
    else setBanner({ k: "fallo", msg: o.msg })
  }

  const send = async () => {
    setBusy("send"); setBanner(null); setFieldErr("")
    const o = await put("respondido", draft.trim())
    setBusy(null)
    if (o.ok) {
      if (id != null) setDrafts(p => { const c = { ...p }; delete c[id]; return c })
      setBanner({ k: o.res.correo === "enviado" ? "enviado" : o.res.correo === "error" ? "error" : "omitido" })
      apply(o.res)
    } else if (o.code === 409) conflict()
    else if (o.code === 400 && o.campos?.respuesta) setFieldErr(o.campos.respuesta)
    else setBanner({ k: "fallo", msg: o.msg })
  }

  const archive = async (): Promise<boolean> => {
    setBusy("arc"); setDlgErr("")
    const o = await put("archivado")
    setBusy(null)
    if (o.ok) { apply(o.res); toast.success("Hoja archivada"); return true }
    if (o.code === 409) { conflict(); return true }
    setDlgErr(o.msg)
    return false
  }

  return { det, status, banner, setBanner, draft, setDraft, fieldErr, busy, dlgErr, setDlgErr, reload: () => { setBanner(null); void load(); onChanged() }, retry: () => void load(), proc, send, archive }
}
