import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  ChevronDown, ChevronRight, CircleAlert, CircleCheck, CircleX, ClipboardList, Copy, FileText, FlaskConical, History, Info, Loader2, Lock, Pencil,
  Search, ShieldCheck, Stethoscope, TriangleAlert, Wrench, Zap, type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import {
  generateAssistedDiagnostic, listAssistedDiagnostics, listWorkOrders, reviewAssistedDiagnostic, type AssistedDiagnostic, type WorkOrder,
} from "../../services/workOrderService"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { ErpDialog } from "../../components/erp/ErpDialog"
import { dateTimeLima, norm } from "../../components/erp/format"
import "../../styles/taller-diagnostico.css"

const Q = (s: string) => `"${s}"`
const I = (Icon: LucideIcon, size = 18, cls = "") => <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />
const OEST: Record<string, [string, string, LucideIcon]> = {
  recibido: ["Recibido", "neu", ClipboardList], diagnostico: ["Diagnóstico", "neu", Stethoscope], cotizado: ["Cotizado", "neu", FileText], aprobado: ["Aprobado", "neu", CircleCheck],
  en_proceso: ["En proceso", "neu", Wrench], pruebas: ["En pruebas", "neu", FlaskConical], listo: ["Listo", "ok", CircleCheck], entregado: ["Entregado", "ok", CircleCheck], cancelado: ["Cancelado", "bad", CircleX],
}
const VEST: Record<string, [string, string, LucideIcon]> = { borrador: ["Borrador", "warn", Pencil], aceptado: ["Aceptado", "ok", CircleCheck], rechazado: ["Rechazado", "bad", CircleX], reemplazado: ["Reemplazado", "neu", History] }
const St = ({ m, k }: { m: Record<string, [string, string, LucideIcon]>; k: string }) => { const x = m[k] || [k, "neu", Info]; return <span className={`st ${x[1]}`}>{I(x[2], 16)}{x[0]}</span> }
const YN: [string, string][] = [["si", "Sí"], ["no", "No"], ["sin_dato", "Sin dato"]]
const MEM: [string, string][] = [["sin_dato", "Sin dato"], ["aprobado", "Aprobada"], ["fallo", "Con fallos"]]
const initialTests = { led_carga: "sin_dato", video_externo: "sin_dato", memoria: "sin_dato", temperatura_cpu: "", smart_salud: "", salud_bateria: "" }
type Tests = typeof initialTests

const payloadTests = (t: Tests) => ({
  led_carga: t.led_carga === "si" ? true : t.led_carga === "no" ? false : undefined,
  video_externo: t.video_externo === "si" ? true : t.video_externo === "no" ? false : undefined,
  memoria: t.memoria === "sin_dato" ? undefined : t.memoria,
  temperatura_cpu: t.temperatura_cpu || undefined, smart_salud: t.smart_salud || undefined, salud_bateria: t.salud_bateria || undefined,
})
const countTests = (t: Tests) => ["led_carga", "video_externo", "memoria"].filter(k => t[k as keyof Tests] !== "sin_dato").length + ["temperatura_cpu", "smart_salud", "salud_bateria"].filter(k => t[k as keyof Tests] !== "").length
const describeTests = (p: Record<string, unknown>) => {
  const out: string[] = []
  if (p.led_carga != null) out.push(`LED de carga ${p.led_carga ? "sí" : "no"}`)
  if (p.video_externo != null) out.push(`video externo ${p.video_externo ? "sí" : "no"}`)
  if (p.memoria) out.push(`memoria ${p.memoria === "aprobado" ? "aprobada" : "con fallos"}`)
  if (p.temperatura_cpu != null) out.push(`temperatura CPU ${p.temperatura_cpu} °C`)
  if (p.smart_salud != null) out.push(`SMART ${p.smart_salud} %`)
  if (p.salud_bateria != null) out.push(`batería ${p.salud_bateria} %`)
  return out.length ? out.join(" . ") : "ninguna"
}

function Seg({ label, opts, value, onChange, disabled }: { label: string; opts: [string, string][]; value: string; onChange: (v: string) => void; disabled: boolean }) {
  const id = `seg-${label.replace(/\W/g, "")}`
  return (
    <div className="sr2"><span className="sl2" id={id}>{label}</span>
      <div className="seg2" role="radiogroup" aria-labelledby={id}>{opts.map(([v, t]) => <button type="button" key={v} role="radio" aria-checked={value === v} disabled={disabled} onClick={() => onChange(v)}>{t}</button>)}</div></div>
  )
}
function Num({ label, unit, aria, value, max, onChange, disabled }: { label: string; unit: string; aria: string; value: string; max: number; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <label className="fld"><span>{label}</span>
      <div className="uw"><input className="in num" aria-label={aria} type="number" min={0} max={max} placeholder="Sin dato" value={value} readOnly={disabled} onChange={e => onChange(e.target.value)} onWheel={e => e.currentTarget.blur()} /><em>{unit}</em></div></label>
  )
}

export default function DiagnosticAssistantPage() {
  useDocumentTitle("Diagnóstico técnico asistido")
  const [params] = useSearchParams()
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [orderId, setOrderId] = useState(params.get("orden") || params.get("order") || "")
  const [symptoms, setSymptoms] = useState("")
  const [tests, setTests] = useState<Tests>(initialTests)
  const [items, setItems] = useState<AssistedDiagnostic[]>([])
  const [finalText, setFinalText] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [genErr, setGenErr] = useState("")
  const [rejOpen, setRejOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const [query, setQuery] = useState("")
  const [step, setStep] = useState<"in" | "res">("in")
  const [mob, setMob] = useState(() => window.innerWidth < 664)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { const on = () => setMob(window.innerWidth < 664); window.addEventListener("resize", on); return () => window.removeEventListener("resize", on) }, [])
  useEffect(() => { listWorkOrders("servicio_tecnico").then(setOrders).catch(() => toast.error("No se pudieron cargar las órdenes")) }, [])
  useEffect(() => {
    if (!menu) return
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [menu])

  const selected = orders.find(o => String(o.id_orden_servicio) === orderId)
  const latest = items[0]
  const loadItems = useCallback(async (id: string) => {
    try { setItems([...(await listAssistedDiagnostics(Number(id)))].sort((a, b) => b.version - a.version)) } catch { toast.error("No se pudo cargar el historial diagnóstico") }
  }, [])
  useEffect(() => {
    setGenErr(""); setTests(initialTests); setFinalText(""); setNote(""); setStep("in")
    if (!orderId) { setItems([]); return }
    void loadItems(orderId)
  }, [orderId, loadItems])
  useEffect(() => { if (selected) setSymptoms(selected.detalle || "") }, [selected?.id_orden_servicio]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setFinalText(""); setNote("") }, [latest?.id_diagnostico_asistido])

  const list = useMemo(() => {
    const q = norm(query.trim())
    return [...orders].sort((a, b) => Number(["entregado", "cancelado"].includes(a.estado)) - Number(["entregado", "cancelado"].includes(b.estado)))
      .filter(o => !q || norm(`${o.codigo} ${o.equipo} ${o.cliente}`).includes(q))
  }, [orders, query])
  const pickOrder = (id: number) => { setOrderId(String(id)); setMenu(false); setQuery("") }

  const generate = async () => {
    if (!orderId) return
    setBusy(true); setGenErr("")
    try {
      const record = await generateAssistedDiagnostic(Number(orderId), { sintomas: symptoms, pruebas: payloadTests(tests) })
      await loadItems(orderId); void record
      setStep("res"); toast.success("Hipótesis generadas para revisión técnica")
    } catch (e) { setGenErr((e as { response?: { data?: { message?: string } } }).response?.data?.message || "No se pudo generar") } finally { setBusy(false) }
  }
  const review = async (estado: "aceptado" | "rechazado") => {
    if (!latest || latest.estado !== "borrador") return
    setBusy(true)
    try {
      await reviewAssistedDiagnostic(Number(orderId), latest.id_diagnostico_asistido, { estado, diagnostico_final: finalText, nota: note })
      await loadItems(orderId); setRejOpen(false)
      toast.success(estado === "aceptado" ? "Diagnóstico humano aprobado" : "Sugerencia rechazada")
    } catch (e) { toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || "No se pudo revisar") } finally { setBusy(false) }
  }
  const copyFinal = async () => {
    try { await navigator.clipboard.writeText(latest?.diagnostico_final || ""); toast.success("Diagnóstico copiado") } catch { toast.error("No se pudo copiar") }
  }

  const rows = (
    <div className="lst">
      {list.map(o => (
        <button type="button" key={o.id_orden_servicio} className="rw2" role="option" aria-selected={String(o.id_orden_servicio) === orderId} onClick={() => pickOrder(o.id_orden_servicio)}>
          <span className="rb"><span className="l1"><b>{o.codigo}</b><St m={OEST} k={o.estado} /></span><span className="l2">{o.equipo}</span><span className="l3">{o.cliente}</span></span>{I(ChevronRight, 16, "ch")}
        </button>
      ))}
      {!list.length && <div className="emp" style={{ minHeight: 120 }}><p>Ninguna orden coincide.</p></div>}
    </div>
  )
  const srch = <div className="srch">{I(Search)}<input className="in" type="search" placeholder="Buscar por código, equipo o cliente" aria-label="Buscar orden por código, equipo o cliente" value={query} onChange={e => setQuery(e.target.value)} /></div>
  const selector = (
    <div className="selw" ref={menuRef}>
      <button type="button" className="selb" aria-haspopup="listbox" aria-expanded={menu} aria-label="Orden de servicio" onClick={() => setMenu(m => !m)}>
        {selected ? <><b>{selected.codigo}</b><span className="tx">{selected.equipo} . {selected.cliente}</span></> : <span className="tx">Elegir orden de servicio</span>}{I(ChevronDown, 16)}
      </button>
      {menu && <div className="selm">{srch}{rows}</div>}
    </div>
  )

  const sympEmpty = !symptoms.trim()
  const nTests = countTests(tests)
  const nextV = (latest?.version || 0) + 1
  const dis = busy
  const genNote = busy ? <p className="hint" role="status">Analizando con reglas-pc-v1...</p>
    : sympEmpty ? <p className="why bad" id="why-gen">{I(CircleAlert, 16)}<span>Escribe los síntomas para generar: el servicio rechaza órdenes sin síntomas.</span></p>
      : <p className="hint">Se envían {nTests} de 6 mediciones . crea la versión {nextV}</p>
  const genBtn = busy
    ? <button type="button" className="btn w" aria-disabled="true" aria-busy="true">{I(Loader2, 18, "sp")}Analizando...</button>
    : <button type="button" className="btn w" aria-disabled={sympEmpty} aria-describedby={sympEmpty ? "why-gen" : undefined} onClick={() => { if (!sympEmpty) void generate() }}>{I(Zap)}Generar hipótesis</button>

  const inputs = (
    <>
      <div className="grp"><h2 className="sh"><b>1</b>Síntomas</h2>
        <label className="fld"><span className="sr">Síntomas</span><textarea className="ta" readOnly={dis} aria-describedby="h1s" placeholder="Describe la falla reportada" value={symptoms} onChange={e => setSymptoms(e.target.value)} /></label>
        <p className="hint" id="h1s">Evita contraseñas, archivos personales y datos que no sean necesarios para diagnosticar.</p></div>
      <div className="grp"><h2 className="sh"><b>2</b>Mediciones y pruebas</h2><p className="hint">Deja {Q("sin dato")} cuando no se haya medido. No inventes valores.</p>
        <Seg label="LED de carga" opts={YN} value={tests.led_carga} disabled={dis} onChange={v => setTests(t => ({ ...t, led_carga: v }))} />
        <Seg label="Video externo" opts={YN} value={tests.video_externo} disabled={dis} onChange={v => setTests(t => ({ ...t, video_externo: v }))} />
        <Seg label="Memoria" opts={MEM} value={tests.memoria} disabled={dis} onChange={v => setTests(t => ({ ...t, memoria: v }))} />
        <div className="nums">
          <Num label="CPU 0-130" unit="°C" aria="Temperatura de CPU en grados Celsius, de 0 a 130" max={130} value={tests.temperatura_cpu} disabled={dis} onChange={v => setTests(t => ({ ...t, temperatura_cpu: v }))} />
          <Num label="SMART 0-100" unit="%" aria="Salud SMART en porcentaje, de 0 a 100" max={100} value={tests.smart_salud} disabled={dis} onChange={v => setTests(t => ({ ...t, smart_salud: v }))} />
          <Num label="Batería 0-100" unit="%" aria="Salud de la batería en porcentaje, de 0 a 100" max={100} value={tests.salud_bateria} disabled={dis} onChange={v => setTests(t => ({ ...t, salud_bateria: v }))} />
        </div>
      </div>
    </>
  )

  const emptyCard = (Icon: LucideIcon, t: string, p: string, alert = false) => <div className="card res"><div className="emp" role={alert ? "alert" : undefined}>{I(Icon, 32)}<h2>{t}</h2><p>{p}</p></div></div>
  const hy = (h: AssistedDiagnostic["resultado"]["hypotheses"][number], i: number, open: boolean) => (
    <li key={h.cause}><details open={open}>
      <summary><b className="no num">{i + 1}</b><span className="cs">{h.cause}</span>
        <span className="cf"><span className="ct">Confianza orientativa <b className="num">{h.confidence} %</b></span><span className="bar" role="img" aria-label={`Confianza orientativa ${h.confidence} %`}><i style={{ width: `${h.confidence}%` }} /></span></span>{I(ChevronDown, 18, "chv")}</summary>
      <div className="hb"><div><h4>Evidencia ({h.evidence.length})</h4><ul>{h.evidence.map(x => <li key={x}>{x}</li>)}</ul></div><div><h4>Acciones ({h.actions.length})</h4><ul>{h.actions.map(x => <li key={x}>{x}</li>)}</ul></div></div>
    </details></li>
  )
  const redFlags = latest && latest.resultado.red_flags.map(f => <div className="rf" role="alert" key={f}>{I(TriangleAlert, 20)}<div><b>Señal de alerta</b>{f}</div></div>)
  const approveOk = finalText.trim() !== ""
  const review_ = latest && latest.estado === "borrador" && (
    <div className="rv">
      <div className="t">{I(ShieldCheck)}<b>Revisión humana obligatoria</b>{!approveOk && <span className="why" id="why-apr">{I(CircleAlert, 16)}<span>Escribe el diagnóstico final para aprobar.</span></span>}</div>
      <p className="hint">Redacta el diagnóstico final basado en mediciones. No copies una hipótesis sin verificarla.</p>
      <div className="g2">
        <label className="fld"><span>Diagnóstico final <i>*</i></span><textarea className="ta" aria-label="Diagnóstico final" value={finalText} onChange={e => setFinalText(e.target.value)} /></label>
        <label className="fld"><span>Nota de revisión / evidencia</span><textarea className="ta" aria-label="Nota de revisión / evidencia confirmatoria" value={note} onChange={e => setNote(e.target.value)} /></label>
      </div>
      {!mob && <div className="acts"><button type="button" className="btn rej" onClick={() => setRejOpen(true)}>Rechazar sugerencia</button><button type="button" className="btn" aria-disabled={!approveOk || busy} aria-describedby={approveOk ? undefined : "why-apr"} onClick={() => { if (approveOk && !busy) void review("aceptado") }}>Aprobar diagnóstico humano</button></div>}
    </div>
  )
  const accepted = latest && latest.estado !== "borrador" && (
    <div className="rv okv">
      <div className="t">{I(Lock, 16)}<b>Diagnóstico final</b><span className="mut">Solo lectura</span>
        {latest.diagnostico_final && <button type="button" className="btn out" style={{ marginLeft: "auto" }} onClick={() => void copyFinal()}>{I(Copy, 16)}Copiar diagnóstico final</button>}</div>
      <div className="ro">{latest.diagnostico_final || <span className="mut">Sin texto de diagnóstico final.</span>}</div>
      <div className="fld"><span>Nota de revisión / evidencia</span><div className="ro">{latest.revision_nota || <span className="mut">Sin nota.</span>}</div></div>
      {latest.estado === "aceptado" && <p className="hint">Aceptar no escribe en el expediente: copia el texto y pégalo en el diagnóstico de la orden.</p>}
    </div>
  )
  const prior = items.slice(1)
  const priorEl = prior.length > 0 && (
    <details className="vs"><summary>Versiones anteriores ({prior.length}){I(ChevronDown, 16, "chv")}</summary>
      {prior.map(v => (
        <details className="vr" key={v.id_diagnostico_asistido}>
          <summary><b>Versión {v.version}</b><span className="num mut">{dateTimeLima(v.creado_en)}</span><St m={VEST} k={v.estado} /></summary>
          <div className="vb">
            <span><b>Síntomas:</b> {v.sintomas}</span><span><b>Mediciones enviadas:</b> {describeTests(v.pruebas || {})}</span>
            <span><b>Hipótesis:</b> {v.resultado.hypotheses.map(h => `${h.cause}, ${h.confidence} %`).join(" . ")}</span>
            {v.resultado.next_tests?.length > 0 && <span><b>Pruebas siguientes:</b> {v.resultado.next_tests.join(" . ")}</span>}
            {v.diagnostico_final && <span><b>Diagnóstico final:</b> {v.diagnostico_final}</span>}
          </div>
        </details>
      ))}
    </details>
  )
  const resultCard = latest && (
    <div className="card res">
      <div className="rh"><h2>Resultado</h2><span className="tag">Versión {latest.version}</span><St m={VEST} k={latest.estado} /><span className="rt num">{dateTimeLima(latest.creado_en)} . motor {latest.resultado.engine}</span></div>
      <div className="rbd">
        <div className="sec"><h3>Hipótesis</h3><ol className="hy">{latest.resultado.hypotheses.map((h, i) => hy(h, i, latest.estado === "borrador" && i === 0))}</ol></div>
        {latest.resultado.next_tests?.length > 0 && <div className="sec nt"><h3>Pruebas siguientes</h3><ul>{latest.resultado.next_tests.map(t => <li key={t}>{I(FlaskConical, 16)}<span>{t}</span></li>)}</ul></div>}
        <p className="disc">{I(Info, 16)}<span>{latest.resultado.disclaimer} La herramienta no cotiza, no repara y no aprueba por sí sola.</span></p>
        {priorEl}
      </div>
      {review_ || accepted}
    </div>
  )
  const gen = (
    <div className="card res"><div className="rh"><h2>Resultado</h2><span className="tag">Versión {nextV}</span><span className="st neu">{I(Loader2, 16, "sp")}Generando</span></div>
      <div className="rbd" aria-busy="true"><p className="why" style={{ color: "hsl(var(--nav-fg-2))" }} role="status">{I(Loader2, 16, "sp")}<span>Analizando síntomas y {nTests} mediciones con reglas-pc-v1...</span></p>
        {[0, 1].map(i => <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 0", borderTop: "1px solid hsl(var(--border))" }}><span className="sk" style={{ width: "70%" }} /><span className="sk" style={{ width: "45%" }} /></div>)}</div></div>
  )
  const result = busy ? gen
    : !orderId ? emptyCard(ClipboardList, "Elige una orden para empezar", `Al elegirla se cargan sus síntomas y sus versiones anteriores. Luego pulsa ${Q("Generar hipótesis")}: son dos acciones.`)
      : genErr ? emptyCard(CircleAlert, "No se generó ninguna versión", genErr, true)
        : latest ? <div className="rcol">{redFlags}{resultCard}</div>
          : emptyCard(FlaskConical, "Aún no hay hipótesis para esta orden", `Revisa los síntomas, anota solo las mediciones que tomaste y pulsa ${Q("Generar hipótesis")}.`)

  const barApr = latest && latest.estado === "borrador" && (
    <div className="bar2"><div className="row"><button type="button" className="btn rej" onClick={() => setRejOpen(true)}>Rechazar sugerencia</button>
      <button type="button" className="btn" aria-disabled={!approveOk || busy} aria-describedby={approveOk ? undefined : "why-apr"} onClick={() => { if (approveOk && !busy) void review("aceptado") }}>Aprobar diagnóstico humano</button></div></div>
  )

  return (
    <div className="pg-tdia">
      <div className="pg">
        <div className="hd"><h1>Diagnóstico asistido</h1>{!mob && selector}{selected && <span className="ost"><St m={OEST} k={selected.estado} /></span>}</div>
        {mob && selector}
        {mob ? (
          <>
            {selected && latest && (
              <div className="seg2" role="radiogroup" aria-label="Paso" style={{ marginBottom: 8 }}>
                <button type="button" role="radio" aria-checked={step === "in"} onClick={() => setStep("in")}>Entradas</button>
                <button type="button" role="radio" aria-checked={step === "res"} onClick={() => setStep("res")}>Resultado</button>
              </div>
            )}
            {!orderId ? <div className="card plist"><div className="ph"><h2 className="sh"><b>1</b>Elige una orden</h2>{srch}</div>{rows}</div>
              : step === "in" || !latest ? <><div className="mcol"><div className="card inp"><div className="ib2">{inputs}</div></div></div><div className="bar2">{genNote}{genBtn}</div></>
                : <><div className="mcol">{busy ? gen : <>{redFlags}{resultCard}</>}</div>{barApr}</>}
          </>
        ) : (
          <div className="md">
            {!orderId ? (
              <div className="card plist"><div className="ph"><h2 className="sh"><b>1</b>Elige una orden</h2>{srch}</div>{rows}</div>
            ) : (
              <div className="card inp"><div className="ib2">{inputs}</div><div className="if">{genNote}{genBtn}</div></div>
            )}
            <div className="rcol">{result}</div>
          </div>
        )}
      </div>

      {rejOpen && latest && (
        <ErpDialog open onOpenChange={o => { if (!o) setRejOpen(false) }} title="¿Rechazar la sugerencia?" icon={I(CircleX, 22)} tone="bad">
          <div className="pg-tdia">
            <p className="hint" style={{ marginTop: 8 }}>La versión {latest.version} quedará registrada como {Q("Rechazado")}, junto con tu nota de revisión. No se modifica el expediente de la orden. Después podrás generar una versión nueva.</p>
            <div className="acts" style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button type="button" className="btn out" onClick={() => setRejOpen(false)}>Cancelar</button>
              <button type="button" className="btn dng" disabled={busy} onClick={() => void review("rechazado")}>Rechazar sugerencia</button>
            </div>
          </div>
        </ErpDialog>
      )}
    </div>
  )
}
