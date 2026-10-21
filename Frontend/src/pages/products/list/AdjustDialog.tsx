import { useState } from "react"
import { ArrowDownUp, CircleX, Info } from "lucide-react"
import { toast } from "sonner"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import { commercialApi } from "../../../services/commercialService"
import { ARROW, I, MINUS, SEP, errMsg, type Row } from "./prodShared"

type Tipo = "ajuste_entrada" | "ajuste_salida"

export function AdjustDialog({ r, ro, onClose, onDone }: { r: Row; ro: boolean; onClose: () => void; onDone: () => void }) {
  const [tipo, setTipo] = useState<Tipo>("ajuste_entrada")
  const [qty, setQty] = useState("1")
  const [motivo, setMotivo] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const close = (o: boolean) => { if (!o && !busy) onClose() }
  const out = tipo === "ajuste_salida"
  const n = /^\d+$/.test(qty.trim()) ? Number(qty.trim()) : 0
  const res = out ? r.p.stock - n : r.p.stock + n
  const why = ro ? "Fuera de horario laboral: no puedes ajustar stock hasta que abra el horario."
    : n < 1 ? "Indica una cantidad entera mayor que 0."
      : !motivo.trim() ? "Escribe el motivo para registrar el ajuste."
        : res < 0 ? `La salida dejaría el stock en ${res}. Reduce la cantidad.` : ""
  const go = async () => {
    if (why || busy) return
    setBusy(true); setErr("")
    try {
      await commercialApi.adjust(r.id, { tipo, cantidad: n, motivo: motivo.trim() })
      toast.success(`Stock de ${r.p.sku}: ${r.p.stock} ${ARROW} ${res}`)
      onDone()
    } catch (e) { setErr(errMsg(e, "No se pudo registrar el ajuste")) }
    finally { setBusy(false) }
  }
  const opt = (k: Tipo, label: string) => <button type="button" className="opt" role="radio" aria-checked={tipo === k} onClick={() => setTipo(k)}>{label}</button>
  return (
    <ErpDialog open onOpenChange={close} title="Ajustar stock" description={`${r.p.nombre}${SEP}${r.p.sku}`} icon={I(ArrowDownUp, 22)}>
      <div className="pg-prod dlgw"><div className="dlg">
        <div className="frm" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
          <div className="ff" role="radiogroup" aria-label="Tipo de ajuste"><span className="lb">Tipo de ajuste</span><div className="opts">{opt("ajuste_entrada", "Entrada")}{opt("ajuste_salida", "Salida")}</div></div>
          <label className="ff"><span className="lb">Cantidad (entera) <i aria-hidden="true">*</i></span><input className="in num" inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)} /></label>
          <label className="ff" style={{ gridColumn: "1/-1" }}><span className="lb">Motivo <i aria-hidden="true">*</i></span>
            <textarea className="ta" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Por qué se ajusta el stock" aria-describedby={why ? "aj-why" : undefined} /></label>
        </div>
        <dl className="dl">
          <div><dt>Stock actual</dt><dd className="num">{r.p.stock}</dd></div>
          <div><dt>{out ? "Salida" : "Entrada"}</dt><dd className="num">{out ? MINUS : "+"}{n}</dd></div>
          <div className="big"><dt>Stock resultante</dt><dd className="num">{res}</dd></div>
        </dl>
        {err && <div className="alert" role="alert">{I(CircleX, 18)}<span><b>No se pudo registrar:</b> {err}</span></div>}
        <div className="acts">
          {why && <span className="why" id="aj-why">{I(Info, 16)}{why}</span>}
          <button type="button" className="btn out" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn" aria-disabled={!!why || busy} aria-describedby={why ? "aj-why" : undefined} onClick={() => void go()}>{busy ? "Registrando..." : "Registrar ajuste"}</button>
        </div>
      </div></div>
    </ErpDialog>
  )
}
