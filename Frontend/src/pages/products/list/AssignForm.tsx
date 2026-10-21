import { useState } from "react"
import { ChevronDown, Info } from "lucide-react"
import { toast } from "sonner"
import { commercialApi } from "../../../services/commercialService"
import { I, SEP, errMsg, type Loc, type Row } from "./prodShared"

const WHY = "Fuera de horario laboral: no puedes asignar existencias hasta que abra el horario."

export function AssignForm({ rows, locs, pid, ro, onSaved }: { rows: Row[]; locs: Loc[]; pid?: number; ro: boolean; onSaved: () => void }) {
  const [prod, setProd] = useState(pid ? String(pid) : "")
  const [loc, setLoc] = useState("")
  const [disp, setDisp] = useState("1")
  const [lote, setLote] = useState("")
  const [serie, setSerie] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const r = rows.find(x => String(x.id) === prod)
  const n = /^\d+$/.test(disp.trim()) ? Number(disp.trim()) : -1
  const why = ro ? WHY : !prod ? "Elige el producto." : !loc ? "Elige la ubicación." : n < 0 ? "Disponible debe ser un entero de 0 o más." : serie.trim() && n > 1 ? "Una serie identifica una sola unidad." : ""
  const go = async () => {
    if (why || busy) return
    setBusy(true); setErr("")
    try {
      await commercialApi.setQuant(Number(prod), { ubicacion_id: Number(loc), disponible: n, lote: lote.trim(), numero_serie: serie.trim() })
      toast.success("Existencia ubicada")
      setLote(""); setSerie("")
      onSaved()
    } catch (e) { setErr(errMsg(e, "No se pudo ubicar la existencia")) }
    finally { setBusy(false) }
  }
  const sel = (label: string, value: string, set: (v: string) => void, children: React.ReactNode, span = false) => (
    <div className="ff" style={span ? { gridColumn: "1/-1" } : undefined}>
      <label htmlFor={`as-${label}`} className="lb">{label} <i aria-hidden="true">*</i></label>
      <div style={{ position: "relative" }}>
        <select id={`as-${label}`} className="sl" value={value} onChange={e => set(e.target.value)} style={{ appearance: "none", WebkitAppearance: "none", paddingRight: 34 }}>{children}</select>
        <span style={{ position: "absolute", right: 10, top: 14, pointerEvents: "none", color: "hsl(var(--muted-foreground))" }}>{I(ChevronDown)}</span>
      </div>
    </div>
  )
  return (
    <>
      <div className="frm" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", marginTop: 16 }}>
        {sel("Producto", prod, setProd, <><option value="">Elige un producto</option>{rows.map(x => <option key={x.id} value={x.id}>{x.p.sku}{SEP}{x.p.nombre}</option>)}</>, true)}
        {sel("Ubicación", loc, setLoc, <><option value="">Elige una ubicación</option>{locs.map(l => <option key={l.id_ubicacion_inventario} value={l.id_ubicacion_inventario}>{l.codigo}{SEP}{l.nombre}</option>)}</>)}
        <label className="ff"><span className="lb">Disponible <i aria-hidden="true">*</i></span><input className="in num" inputMode="numeric" value={disp} onChange={e => setDisp(e.target.value)} /></label>
        <label className="ff"><span className="lb">Lote</span><input className="in" value={lote} onChange={e => setLote(e.target.value)} placeholder="Opcional" /></label>
        <label className="ff"><span className="lb">Número de serie</span><input className="in" value={serie} onChange={e => setSerie(e.target.value)} placeholder="Opcional" /><span className="hint">Una serie identifica 1 unidad.</span></label>
        {r && <div className="hint" style={{ gridColumn: "1/-1" }}>Stock {r.p.stock}: {r.p.stock - Math.max(r.su, 0)} asignadas, {Math.max(r.su, 0)} sin ubicar. La suma de ubicaciones no puede superar el stock.</div>}
      </div>
      {err && <div className="alert" role="alert">{I(Info, 18)}<span>{err}</span></div>}
      <div className="rowx sb" style={{ marginTop: 14 }}>
        <span className="why" id="asg-why" style={{ visibility: why ? "visible" : "hidden" }}>{I(Info, 16)}{why || "."}</span>
        <button type="button" className="btn" aria-disabled={!!why || busy} aria-describedby={why ? "asg-why" : undefined} onClick={() => void go()}>{busy ? "Guardando..." : "Asignar existencia"}</button>
      </div>
    </>
  )
}
