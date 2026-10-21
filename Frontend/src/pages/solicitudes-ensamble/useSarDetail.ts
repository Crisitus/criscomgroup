import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { mensajeDeError, solicitudEnsambleService, type SolicitudEnsamble } from "../../services/solicitudEnsambleService"
import { estadoHttp, MATRIZ } from "./sarCommon"
import { CAMPO_FORM, aPayload, baseDraft, hayCambios, recotiza, validar, type CampoErr, type Draft } from "./sarDraft"

export type DetStatus = "idle" | "load" | "ok" | "error" | "forbidden" | "notfound"
export type Banner =
  | { k: "save"; antes: SolicitudEnsamble["estado"]; recot: boolean }
  | { k: "conv"; numero: string; ya: boolean }
  | { k: "c409"; msg: string }
  | { k: "fallo"; msg: string }

/** Detalle de una solicitud + borrador por solicitud + guardar (PUT estado) y convertir (POST). */
export function useSarDetail(id: number | null, onChanged: () => void) {
  const [det, setDet] = useState<SolicitudEnsamble | null>(null)
  const [status, setStatus] = useState<DetStatus>("idle")
  const [banner, setBanner] = useState<Banner | null>(null)
  const [drafts, setDrafts] = useState<Record<number, Partial<Draft>>>({})
  const [err, setErr] = useState<CampoErr>({})
  const [busy, setBusy] = useState<"save" | "conv" | null>(null)
  const [rej, setRej] = useState(false)
  const seq = useRef(0)

  const load = useCallback(async (quiet = false) => {
    if (id == null) { setDet(null); setStatus("idle"); return }
    const n = ++seq.current
    if (!quiet) setStatus("load")
    try {
      const r = await solicitudEnsambleService.getOne(id)
      if (n !== seq.current) return
      setDet(r); setStatus("ok")
    } catch (error) {
      if (n !== seq.current) return
      const c = estadoHttp(error)
      if (!quiet) setDet(null)
      setStatus(c === 403 ? "forbidden" : c === 404 ? "notfound" : "error")
    }
  }, [id])
  useEffect(() => { setBanner(null); setErr({}); setRej(false); void load() }, [load])

  const base = useMemo(() => (det ? baseDraft(det) : null), [det])
  const draft = useMemo(() => (base && id != null ? { ...base, ...drafts[id] } : null), [base, drafts, id])
  const dirty = !!(draft && base && hayCambios(draft, base))
  const transiciones = det ? (det.transiciones ?? MATRIZ[det.estado]) : []

  const setDraft = (patch: Partial<Draft>) => {
    if (id == null) return
    setDrafts(p => ({ ...p, [id]: { ...p[id], ...patch } })); setErr({}); setRej(false)
  }
  const discard = () => {
    if (id == null) return
    setDrafts(p => { const c = { ...p }; delete c[id]; return c }); setErr({}); setRej(false)
  }

  const apply = (res: SolicitudEnsamble) => { setDet(res); void onChanged() }
  const fail = (error: unknown, fallback: string) => {
    const code = estadoHttp(error)
    const data = (error as { response?: { data?: { errores?: Record<string, string> } } })?.response?.data
    const msg = mensajeDeError(error, fallback)
    if (code === 409) setBanner({ k: "c409", msg })
    else if (code === 400 && data?.errores) {
      const e: CampoErr = {}
      Object.entries(data.errores).forEach(([k, v]) => { const f = CAMPO_FORM[k]; if (f) e[f] = v })
      if (Object.keys(e).length) setErr(e); else setBanner({ k: "fallo", msg })
    } else setBanner({ k: "fallo", msg })
  }

  const save = async () => {
    if (!det || !draft || !base || busy) return
    const local = validar(draft, det)
    if (Object.keys(local).length) { setErr(local); setRej(false); return }
    setBusy("save"); setBanner(null); setErr({}); setRej(false)
    const antes = det.estado
    const recot = recotiza(draft, det)
    try {
      const res = await solicitudEnsambleService.updateEstado(det.id_solicitud, aPayload(draft, base, det))
      discard(); apply(res); setBanner({ k: "save", antes, recot })
      toast.success("Cambios guardados")
    } catch (error) { fail(error, "No se pudo guardar el cambio") }
    finally { setBusy(null) }
  }

  const convert = async () => {
    if (!det || busy) return
    setBusy("conv"); setBanner(null)
    try {
      const r = await solicitudEnsambleService.convertir(det.id_solicitud)
      const fresh = await solicitudEnsambleService.getOne(det.id_solicitud)
      apply(fresh); setBanner({ k: "conv", numero: r.numero ?? "", ya: r.ya_convertida })
      toast.success(r.ya_convertida ? "La solicitud ya estaba convertida" : "Cotización creada en borrador")
    } catch (error) { fail(error, "No se pudo convertir la solicitud") }
    finally { setBusy(null) }
  }

  const reload = () => { setBanner(null); setErr({}); discard(); void load(); onChanged() }
  return { det, status, banner, draft, base, dirty, transiciones, err, busy, rej, setRej, setDraft, discard, save, convert, reload, retry: () => void load() }
}
