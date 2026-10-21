import { useCallback, useEffect, useRef, useState } from "react"
import { getPostventaDetalle, mensajeError, updatePostventa, type SolicitudPostventa } from "../../services/postventaService"
import { buildBody, initDraft, isDirty, mapErrores, validate, type Draft, type Errs, type FieldKey } from "./pvDraft"
import { EST } from "./pvCommon"

export type Ban = { k: "403" | "409" | "ok" | "err"; t: string } | null
type Pend = null | "list" | number

const status = (e: unknown) => (e as { response?: { status?: number } })?.response?.status

/** Caso abierto: carga (GET /:id), borrador, guardado, reapertura y aviso de cambios sin guardar. */
export function usePostventaDetail(onSaved: () => void) {
  const [selId, setSelId] = useState<number | null>(null)
  const [c, setC] = useState<SolicitudPostventa | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadErr, setLoadErr] = useState("")
  const [d, setD] = useState<Draft | null>(null)
  const [errs, setErrs] = useState<Errs>({})
  const [ban, setBan] = useState<Ban>(null)
  const [pend, setPend] = useState<Pend>(null)
  const [crf, setCrf] = useState(false)
  const [nopen, setNopen] = useState(false)
  const [saving, setSaving] = useState(false)
  const seq = useRef(0)

  const dirty = !!c && !!d && isDirty(c, d)

  const fetchCase = useCallback(async (id: number, keepBan?: Ban) => {
    const mine = ++seq.current
    setLoading(true); setLoadErr("")
    try {
      const res = await getPostventaDetalle(id)
      if (mine !== seq.current) return
      setC(res); setD(initDraft(res)); setErrs({}); setBan(keepBan ?? null); setCrf(false)
    } catch (e) {
      if (mine !== seq.current) return
      setC(null); setD(null); setLoadErr(mensajeError(e, "No se pudo abrir la solicitud."))
    } finally {
      if (mine === seq.current) setLoading(false)
    }
  }, [])

  const open = useCallback((id: number) => {
    setSelId(id); setPend(null); setNopen(false); setC(null); setD(null)
    void fetchCase(id)
  }, [fetchCase])

  /** Abrir otro caso: si hay cambios sin guardar, primero avisa. */
  const request = (id: number) => {
    if (id === selId && c) return
    if (dirty) setPend(id); else open(id)
  }
  const back = () => { if (dirty) setPend("list"); else close() }
  const close = () => { seq.current++; setSelId(null); setC(null); setD(null); setPend(null); setErrs({}); setBan(null); setCrf(false); setLoading(false) }
  const keep = () => setPend(null)
  const drop = () => { const go = pend; setPend(null); if (go === "list") close(); else if (typeof go === "number") open(go) }
  const undo = () => { if (c) { setD(initDraft(c)); setErrs({}); setBan(null) } }
  const reload = () => { if (selId != null) { void fetchCase(selId); onSaved() } }

  const setState = (estado: Draft["estado"]) => { setD(p => (p ? { ...p, estado } : p)); setErrs({}); setBan(null) }
  const setField = (f: Exclude<FieldKey, "estado">, v: string) => {
    setD(p => (p ? { ...p, [f]: v } : p))
    setErrs(p => { if (!p[f]) return p; const n = { ...p }; delete n[f]; return n })
  }

  const send = async (body: Parameters<typeof updatePostventa>[1], nuevo: string) => {
    if (!c) return
    setSaving(true); setBan(null)
    try {
      await updatePostventa(c.id_solicitud, body)
      await fetchCase(c.id_solicitud, { k: "ok", t: nuevo })
      onSaved()
    } catch (e) {
      const st = status(e)
      const errores = (e as { response?: { data?: { errores?: Record<string, string> } } })?.response?.data?.errores
      const msg = mensajeError(e, "No se pudo guardar la solicitud. Inténtalo de nuevo.")
      if (st === 400 && errores && Object.keys(mapErrores(errores)).length) setErrs(mapErrores(errores))
      else setBan({ k: st === 403 ? "403" : st === 409 ? "409" : "err", t: msg })
    } finally {
      setSaving(false)
    }
  }

  const save = async () => {
    if (!c || !d || saving) return
    const e = validate(c, d)
    setBan(null)
    if (Object.keys(e).length) { setErrs(e); return }
    setErrs({})
    const body = buildBody(c, d)
    if (!Object.keys(body).length) return
    const cambioEstado = body.estado ? `Estado: ${EST[body.estado]}. ` : ""
    await send(body, `${cambioEstado}Los cambios quedaron registrados en el historial y se actualizó la bandeja.`)
  }

  const reopen = async () => {
    setCrf(false)
    await send({ estado: "en_revision" }, "Solicitud reabierta: ahora está «En revisión» y quedó registrado en el historial.")
  }

  useEffect(() => {
    if (!dirty) return
    const h = (ev: BeforeUnloadEvent) => { ev.preventDefault(); ev.returnValue = "" }
    window.addEventListener("beforeunload", h)
    return () => window.removeEventListener("beforeunload", h)
  }, [dirty])

  return {
    selId, c, d, loading, loadErr, errs, ban, pend, crf, nopen, saving, dirty,
    open, request, back, close, keep, drop, undo, reload, setState, setField, save, reopen,
    setCrf, setNopen,
  }
}

export type PostventaDetail = ReturnType<typeof usePostventaDetail>
