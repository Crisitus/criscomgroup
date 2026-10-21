import { useCallback, useEffect, useRef, useState } from "react"
import { solicitudImportacionService, type SolicitudImportacion } from "../../services/solicitudImportacionService"
import { ESTADO, errCampos, errMensaje, estadoHttp } from "./simCommon"
import { dirty, draftDe, payloadDe, validar, type Draft, type Errs } from "./simForm"

export type DetStatus = "idle" | "load" | "ok" | "error" | "forbidden" | "notfound"
export type Banner = { k: "ok" | "c409" | "fallo"; t: string; h?: string }
const MAPA: Record<string, keyof Errs> = {
  cotizacion_monto: "monto", cotizacion_nota: "nota", notas_admin: "notas", fecha_entrega_estimada: "entrega", vigencia_dias: "vig",
}

/** Detalle + borrador de gestion (estado, cotizacion, notas) + guardar y convertir. Nada se descarta solo. */
export function useSimDetail(id: number | null, onChanged: () => void) {
  const [det, setDet] = useState<SolicitudImportacion | null>(null)
  const [status, setStatus] = useState<DetStatus>("idle")
  const [draft, setDraft] = useState<Draft | null>(null)
  const [errs, setErrs] = useState<Errs>({})
  const [banner, setBanner] = useState<Banner | null>(null)
  const [busy, setBusy] = useState<"save" | "conv" | null>(null)
  const seq = useRef(0)
  const cur = useRef<{ det: SolicitudImportacion | null; draft: Draft | null }>({ det: null, draft: null })
  cur.current = { det, draft }

  const load = useCallback(async (mode: "fresh" | "quiet" | "text" = "fresh") => {
    if (id == null) { setDet(null); setDraft(null); setStatus("idle"); return }
    const n = ++seq.current
    if (mode === "fresh") { setStatus("load"); setDet(null); setDraft(null) }
    try {
      const r = await solicitudImportacionService.getOne(id)
      if (n !== seq.current) return
      const { det: old, draft: d } = cur.current
      const next = draftDe(r)
      if (d && old && mode !== "fresh") {
        const base = draftDe(old)
        if (mode === "quiet") Object.assign(next, d, { estado: r.estado === old.estado ? d.estado : r.estado })
        else (["nota", "notas", "entrega"] as const).forEach(k => { if (d[k] !== base[k]) next[k] = d[k] })
      }
      setDet(r); setDraft(next); setStatus("ok")
    } catch (error) {
      if (n !== seq.current) return
      const c = estadoHttp(error)
      if (mode === "fresh") setDet(null)
      setStatus(c === 403 ? "forbidden" : c === 404 ? "notfound" : "error")
    }
  }, [id])
  useEffect(() => { setBanner(null); setErrs({}); setBusy(null); void load("fresh") }, [load])

  const patch = (c: Partial<Draft>) => {
    setDraft(p => (p ? { ...p, ...c } : p))
    setErrs(p => { const q = { ...p }; (Object.keys(c) as (keyof Draft)[]).forEach(k => { delete q[k as keyof Errs] }); if ("estado" in c) { delete q.monto; delete q.nota } return q })
  }

  const save = async () => {
    if (!det || !draft || id == null) return
    const e = validar(det, draft)
    setErrs(e)
    if (Object.keys(e).length) { setBanner(null); return }
    setBusy("save"); setBanner(null)
    try {
      const r = await solicitudImportacionService.updateEstado(id, payloadDe(det, draft))
      setDet(r); setDraft(draftDe(r)); setErrs({})
      const cambio = r.estado !== det.estado ? `La solicitud pasó a ${ESTADO[r.estado].l}. ` : ""
      setBanner({ k: "ok", t: `${cambio}Los cambios quedaron guardados en el servidor.` })
      onChanged()
    } catch (error) {
      const code = estadoHttp(error)
      const campos = errCampos(error)
      const nuevos: Errs = {}
      Object.entries(campos).forEach(([k, v]) => { const f = MAPA[k]; if (f) nuevos[f] = v })
      if (code === 400 && Object.keys(nuevos).length) { setErrs(nuevos); setBanner(null) }
      else if (code === 409) setBanner({ k: "c409", t: errMensaje(error, "La solicitud cambió mientras la editabas.") })
      else setBanner({ k: "fallo", t: errMensaje(error, "No se pudo guardar el cambio. Lo que escribiste se conserva.") })
    } finally { setBusy(null) }
  }

  const convertir = async () => {
    if (!det || id == null || busy) return
    setBusy("conv"); setBanner(null)
    try {
      const res = await solicitudImportacionService.convertir(id)
      await load("quiet")
      setBanner({ k: "ok", h: res.ya_convertida ? "Ya estaba convertida" : "Importación creada", t: res.ya_convertida ? `Ya estaba convertida: no se creó otra importación (Importación #${res.importacion_id}).` : `Se creó la Importación #${res.importacion_id} en estado planificada. No se movió dinero ni stock.` })
      onChanged()
    } catch (error) {
      const code = estadoHttp(error)
      setBanner({ k: code === 409 ? "c409" : "fallo", t: errMensaje(error, "No se pudo convertir la solicitud.") })
    } finally { setBusy(null) }
  }

  const reload = () => { setBanner(null); setErrs({}); void load("text"); onChanged() }
  return {
    det, status, draft, errs, banner, busy, patch, save, convertir, reload, retry: () => void load("fresh"),
    dirty: !!(det && draft && dirty(det, draft)),
  }
}
