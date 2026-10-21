import { useCallback, useEffect, useMemo, useState } from "react"
import { apiFailure, fetchBusinessHours, updateBusinessHours, type ApiFailure, type BusinessHours } from "../../../services/companyService"
import { isHHmm, nowLimaStamp } from "./empFormat"

export type HzLoad = "load" | "ok" | "error" | "forbidden" | "nocompany"
export interface HzDraft { on: boolean; ini: string; fin: string }
export interface HzSaved { avisos: string[]; at: string }
export type HzErrors = { ini?: string; fin?: string }

const draftOf = (h: BusinessHours): HzDraft => ({ on: h.horario_restriccion_activa, ini: h.horario_inicio, fin: h.horario_fin })

/** "0850" / "850" / "8" -> "08:50" / "08:50" / "08:00" al salir del campo. */
export function normTime(v: string): string {
  const t = v.trim()
  if (/^\d{1,2}$/.test(t)) return `${t.padStart(2, "0")}:00`
  if (/^\d{3,4}$/.test(t)) { const p = t.padStart(4, "0"); return `${p.slice(0, 2)}:${p.slice(2)}` }
  if (/^\d{1,2}:\d{1,2}$/.test(t)) { const [a, b] = t.split(":"); return `${a.padStart(2, "0")}:${b.padStart(2, "0")}` }
  return t
}

export function useEmpHorario(onDirty?: (n: number) => void) {
  const [base, setBase] = useState<BusinessHours | null>(null)
  const [status, setStatus] = useState<HzLoad>("load")
  const [failure, setFailure] = useState<ApiFailure | null>(null)
  const [draft, setDraft] = useState<HzDraft>({ on: true, ini: "08:50", fin: "21:15" })
  const [server, setServer] = useState<HzErrors>({})
  const [msg, setMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<HzSaved | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setStatus("load")
    try {
      const h = await fetchBusinessHours()
      if (h.configurada === false) { if (!silent) setStatus("nocompany"); return }
      if (silent) setBase(prev => (prev ? { ...prev, ahora_lima: h.ahora_lima, dentro_de_horario: h.dentro_de_horario } : prev))
      else { setBase(h); setDraft(draftOf(h)); setStatus("ok") }
    } catch (error) {
      if (silent) return
      const f = apiFailure(error, "No se pudo cargar el horario")
      setFailure(f); setStatus(f.status === 403 ? "forbidden" : f.status === 404 ? "nocompany" : "error")
    }
  }, [])
  useEffect(() => { void load() }, [load])
  // La hora de Lima la trae el servidor: se refresca cada minuto sin tocar lo que se esta editando.
  useEffect(() => {
    const t = window.setInterval(() => void load(true), 60000)
    return () => window.clearInterval(t)
  }, [load])

  const changed = useMemo(() => {
    if (!base) return [] as string[]
    const out: string[] = []
    if (draft.on !== base.horario_restriccion_activa) out.push("Restricción")
    if (draft.ini !== base.horario_inicio) out.push("Hora de inicio")
    if (draft.fin !== base.horario_fin) out.push("Hora de cierre")
    return out
  }, [draft, base])
  useEffect(() => { onDirty?.(changed.length) }, [changed.length, onDirty])

  const errs: HzErrors = useMemo(() => {
    const e: HzErrors = {}
    if (!isHHmm(draft.ini)) e.ini = "Usa el formato HH:mm de 24 horas (por ejemplo 08:50)."
    if (!isHHmm(draft.fin)) e.fin = "Usa el formato HH:mm de 24 horas (por ejemplo 21:15)."
    else if (draft.ini === draft.fin) e.fin = "El cierre debe ser distinto del inicio."
    return { ...e, ...(server.ini ? { ini: server.ini } : {}), ...(server.fin ? { fin: server.fin } : {}) }
  }, [draft, server])

  const set = useCallback((patch: Partial<HzDraft>) => {
    setDraft(d => ({ ...d, ...patch })); setSaved(null); setMsg(null)
    setServer(s => ({ ...s, ...("ini" in patch ? { ini: undefined } : {}), ...("fin" in patch ? { fin: undefined } : {}) }))
  }, [])
  const discard = useCallback(() => { if (base) setDraft(draftOf(base)); setServer({}); setMsg(null) }, [base])

  const submit = useCallback(async () => {
    if (!base || errs.ini || errs.fin) return false
    setSaving(true); setMsg(null)
    try {
      const res = await updateBusinessHours({ horario_inicio: draft.ini, horario_fin: draft.fin, horario_restriccion_activa: draft.on })
      setBase(res); setDraft(draftOf(res)); setServer({})
      setSaved({ avisos: res.avisos ?? [], at: nowLimaStamp() })
      return true
    } catch (error) {
      const f = apiFailure(error, "No se pudo guardar el horario")
      if (f.status === 404) { setStatus("nocompany"); return false }
      setServer({ ini: f.errores.horario_inicio, fin: f.errores.horario_fin })
      if (!f.errores.horario_inicio && !f.errores.horario_fin) setMsg(f.message)
      return false
    } finally { setSaving(false) }
  }, [base, draft, errs.ini, errs.fin])

  return { base, status, failure, draft, set, discard, changed, errs, msg, saving, saved, load, submit, dismissSaved: () => setSaved(null) }
}
