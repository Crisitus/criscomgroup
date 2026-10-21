import { useEffect, useRef, useState } from "react"
import { CircleAlert } from "lucide-react"
import { toast } from "sonner"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import { adjustStock } from "./api"
import { Field, Opts } from "./fields"
import { I, MINUS, errMsg, intOf } from "./shared"

type Kind = "entrada" | "salida"

/** Ajuste de stock con motivo: se registra al instante en el historial (no depende de Guardar). */
export function DlgAdjust({ id, name, stock, onClose, onDone }: { id: number; name: string; stock: number; onClose: () => void; onDone: () => void }) {
  const [kind, setKind] = useState<Kind>("salida")
  const [qty, setQty] = useState("1")
  const [why, setWhy] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")
  const first = useRef<HTMLInputElement>(null)
  useEffect(() => { first.current?.focus() }, [])
  const n = intOf(qty)
  const qtyOk = !Number.isNaN(n) && n >= 1
  const next = qtyOk ? (kind === "entrada" ? stock + n : stock - n) : null
  const negative = next !== null && next < 0
  const reason = !qtyOk ? "Indica una cantidad entera de 1 o más." : negative ? `La salida deja el stock en negativo (${stock} ${MINUS} ${n}).` : !why.trim() ? "Escribe el motivo del ajuste." : ""
  const can = !reason && !busy

  const submit = async () => {
    if (!can) return
    setBusy(true); setMsg("")
    try {
      await adjustStock(id, kind === "entrada" ? "ajuste_entrada" : "ajuste_salida", n, why.trim())
      toast.success(`Stock ajustado: ${stock} → ${next}`)
      onDone()
    } catch (e) { setMsg(errMsg(e, "No se pudo aplicar el ajuste")) }
    finally { setBusy(false) }
  }
  return (
    <ErpDialog open onOpenChange={o => { if (!o && !busy) onClose() }} title="Ajustar stock" description={`${name} · stock actual ${stock}`}>
      <div className="pg-ficha dlgw">
        <form className="dlg" onSubmit={e => { e.preventDefault(); void submit() }}>
          <div className="g2 gq">
            <Opts label="Tipo de ajuste" value={kind} onChange={setKind} items={[["entrada", "Entrada"], ["salida", "Salida"]]} />
            <Field label="Cantidad" error={qty !== "" && !qtyOk ? "Entero de 1 o más" : undefined}>
              <input ref={first} className="in num" inputMode="numeric" value={qty} aria-invalid={!qtyOk} onChange={e => setQty(e.target.value)} />
            </Field>
          </div>
          <Field label={<>Motivo <i>*</i></>}>
            <input className="in" value={why} placeholder="Ej.: cable dañado en taller" onChange={e => setWhy(e.target.value)} />
          </Field>
          <div className="res" role="status">
            <span>Stock resultante</span>
            <span><b style={negative ? { color: "hsl(var(--destructive-text))" } : undefined}>{next ?? "—"}</b> <span className="hint">{next !== null ? `${stock} ${kind === "entrada" ? "+" : MINUS} ${n}` : ""}</span></span>
          </div>
          {msg ? <div className="why bad" role="alert">{I(CircleAlert)}<span>{msg}</span></div>
            : <div className="note">{I(CircleAlert)}<span>Se registra al instante en el historial; no depende de {"«Guardar»"}.</span></div>}
          {reason && <div className="why" id="fch-adj-why">{I(CircleAlert)}<span>{reason}</span></div>}
          <div className="acts">
            <button type="button" className="btn out" onClick={onClose} aria-disabled={busy}>Cancelar</button>
            <button type="submit" className="btn" aria-disabled={!can} aria-describedby={reason ? "fch-adj-why" : undefined}>{busy ? "Aplicando…" : "Aplicar ajuste"}</button>
          </div>
        </form>
      </div>
    </ErpDialog>
  )
}
