import { useState } from "react"
import { Check, ChevronLeft, X } from "lucide-react"
import { toast } from "sonner"
import { createAcquisition, evaluateAcquisition } from "../../services/acquisitionService"
import type { Product } from "../../services/productService"
import { ARROW, I, Q, SEP, errMsg, okTest, sol } from "./acqShared"
import { EMPTY, REQ, stepOfError, toBody, type Form } from "./acqFormState"
import { Step1, Step2, Step3, Step4 } from "./AcqSteps"
import { EvalPanel } from "./AcqEval"
import type { Evaluacion } from "./acqShared"
import { ChevronRight } from "lucide-react"

const STEPS = ["Transferente", "Equipo", "Evaluación técnica", "Declaración e inventario"]

export function AcqWizard({ products, mob, onCancel, onSaved }: { products: Product[]; mob: boolean; onCancel: () => void; onSaved: (id: number) => void }) {
  const [f, setF] = useState<Form>(EMPTY)
  const [step, setStep] = useState(1)
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [ev, setEv] = useState<Evaluacion | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (k: string, v: string) => { setF(c => ({ ...c, s: { ...c.s, [k]: v } })); setErrs(e => ({ ...e, [k]: "" })); if (["prueba_funcional", "smart_salud_porcentaje", "tbw_escrito", "tbw_nominal", "ciclos_bateria", "capacidad_bateria_diseno", "capacidad_bateria_actual"].includes(k)) setEv(null) }
  const okT = okTest({ prueba_funcional: f.s.prueba_funcional as never })
  const prod = products.find(p => p.id_producto === f.producto)
  const ingresa = !!prod && okT && f.ingresar

  const check = (n: number) => {
    const e: Record<string, string> = {}
    REQ[n].forEach(([k, m]) => { if (!f.s[k].trim()) e[k] = m })
    if (n === 1 && f.s.tipo_operacion === "compra" && !(Number(f.s.monto_adquisicion) > 0)) e.monto_adquisicion = "Una compra exige un monto mayor a S/ 0.00. Si no hubo pago, cambia el tipo a Donación o Cesión gratuita."
    if (n === 4 && !f.propiedad) e.propiedad = "Se requiere la declaración de propiedad y procedencia."
    setErrs(e)
    return !Object.values(e).some(Boolean)
  }
  const next = () => { if (check(step)) setStep(step + 1) }
  const goto = (n: number) => { if (n <= step || [...Array(n - 1).keys()].every(i => check(i + 1))) setStep(n) }
  const calc = async () => {
    setBusy(true)
    try { setEv(await evaluateAcquisition(toBody(f))) } catch (e) { toast.error(errMsg(e, "No se pudo calcular la evaluación")) } finally { setBusy(false) }
  }
  const submit = async () => {
    if (!check(4)) return
    for (const n of [1, 2]) if (!check(n)) { setStep(n); return }
    setBusy(true)
    try {
      const body = { ...toBody(f), producto_id: f.producto ?? undefined, registrar_inventario: ingresa }
      const a = await createAcquisition(body)
      toast.success(ingresa ? `Expediente #${a.id_adquisicion} registrado e ingresado al stock` : `Expediente #${a.id_adquisicion} registrado sin ingresar al stock`)
      onSaved(a.id_adquisicion)
    } catch (e) {
      const m = errMsg(e, "No se pudo registrar el expediente"), n = stepOfError(m)
      toast.error(m)
      if (n) { setStep(n); setErrs(n === 4 ? { producto: m } : n === 1 ? { monto_adquisicion: m } : n === 2 ? { numero_serie: m } : {}) }
    } finally { setBusy(false) }
  }

  const last = step === 4
  const msg = last ? (ingresa && prod ? <>Se ingresará <b>1 unidad</b> a {Q(prod.nombre)} ({prod.stock} {ARROW} {prod.stock + 1}) con costo <b>{sol(f.s.tipo_operacion === "compra" ? f.s.monto_adquisicion : 0)}</b>.</> : "Se registrará el expediente sin ingresar al stock.") : `Paso ${step} de 4`
  const p = { f, set, errs }
  const body = step === 1 ? <Step1 {...p} /> : step === 2 ? <Step2 {...p} /> : step === 3 ? <Step3 {...p} /> : <Step4 {...p} products={products} setF={setF} />
  const ftb = (
    <div className={`ftb${mob ? " fx" : ""}`}>
      {step > 1 && <button type="button" className="btn out" onClick={() => setStep(step - 1)}>{!mob && I(ChevronLeft)}Atrás</button>}
      {!mob && <span className="sp">{msg}</span>}
      {last
        ? <button type="button" className="btn" aria-disabled={busy} onClick={() => { if (!busy) void submit() }}>{I(Check)}Registrar expediente</button>
        : <button type="button" className="btn" onClick={next}>Siguiente{!mob && I(ChevronRight)}</button>}
    </div>
  )
  if (mob) return (
    <div className="pg">
      <div className="hd"><h1>Nuevo expediente</h1><div className="ac"><button type="button" className="btn out sq" aria-label="Cancelar" onClick={onCancel}>{I(X)}</button></div></div>
      <div className="mst"><div className="mt"><b>Paso {step} de 4</b>{SEP}{STEPS[step - 1]}</div><div className="fl4" role="img" aria-label={`Paso ${step} de 4`}>{[1, 2, 3, 4].map(i => <i key={i} className={i <= step ? "on" : ""} />)}</div></div>
      <div className="card fb" style={{ flex: 1 }} role="group" aria-label={STEPS[step - 1]}>{body}</div>
      <EvalPanel d={ev} step={step} mob busy={busy} onCalc={calc} />{ftb}
    </div>
  )
  return (
    <div className="pg">
      <div className="hd"><h1>Adquisiciones de segunda mano</h1><div className="ac"><button type="button" className="btn out" onClick={onCancel}>Cancelar</button></div></div>
      <div className="fm"><section className="card fc2" aria-label="Nuevo expediente">
        <nav className="stp" aria-label="Pasos del expediente">{STEPS.map((t, i) => { const n = i + 1, dn = n < step; return (
          <button type="button" key={t} className={`sp1${dn ? " dn" : ""}`} aria-current={n === step ? "step" : undefined} onClick={() => goto(n)}><span className="t"><span className="n2">{dn ? I(Check, 14) : n}</span>{t}</span><span className="s">{"\u00a0"}</span></button>) })}</nav>
        <div className="fb" role="group" aria-label={STEPS[step - 1]}>{body}</div>{ftb}</section>
        <EvalPanel d={ev} step={step} mob={false} busy={busy} onCalc={calc} /></div>
    </div>
  )
}
