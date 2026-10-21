import { useState } from "react"
import { Info } from "lucide-react"
import { toast } from "sonner"
import { commercialApi } from "../../../services/commercialService"
import { I, TIPOS, errMsg } from "./prodShared"

const WHY = "Fuera de horario laboral: no puedes crear ubicaciones hasta que abra el horario."

export function LocationForm({ ro, onSaved }: { ro: boolean; onSaved: () => void }) {
  const [codigo, setCodigo] = useState("")
  const [nombre, setNombre] = useState("")
  const [tipo, setTipo] = useState("almacen")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const why = ro ? WHY : !codigo.trim() ? "Escribe el código de la ubicación." : !nombre.trim() ? "Escribe el nombre de la ubicación." : ""
  const go = async () => {
    if (why || busy) return
    setBusy(true); setErr("")
    try {
      await commercialApi.createLocation({ codigo: codigo.trim(), nombre: nombre.trim(), tipo })
      toast.success("Ubicación creada")
      setCodigo(""); setNombre(""); setTipo("almacen")
      onSaved()
    } catch (e) { setErr(errMsg(e, "No se pudo crear la ubicación")) }
    finally { setBusy(false) }
  }
  return (
    <>
      <div className="frm" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", marginTop: 16 }}>
        <label className="ff"><span className="lb">Código <i aria-hidden="true">*</i></span><input className="in" value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Ej.: TALLER-A" /></label>
        <label className="ff"><span className="lb">Nombre <i aria-hidden="true">*</i></span><input className="in" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre de la ubicación" /></label>
        <div className="ff" style={{ gridColumn: "1/-1" }} role="radiogroup" aria-label="Tipo de ubicación">
          <span className="lb">Tipo <i aria-hidden="true">*</i></span>
          <div className="opts">{Object.entries(TIPOS).map(([k, l]) => <button type="button" key={k} className="opt" role="radio" aria-checked={tipo === k} onClick={() => setTipo(k)}>{l}</button>)}</div>
        </div>
      </div>
      {err && <div className="alert" role="alert">{I(Info, 18)}<span>{err}</span></div>}
      <div className="rowx sb" style={{ marginTop: 14 }}>
        <span className="why" id="loc-why" style={{ visibility: why ? "visible" : "hidden" }}>{I(Info, 16)}{why || "."}</span>
        <button type="button" className="btn" aria-disabled={!!why || busy} aria-describedby={why ? "loc-why" : undefined} onClick={() => void go()}>{busy ? "Creando..." : "Crear ubicación"}</button>
      </div>
    </>
  )
}
