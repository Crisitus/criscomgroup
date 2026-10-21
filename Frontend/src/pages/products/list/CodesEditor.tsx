import { useRef, useState } from "react"
import { Plus, Shuffle, Trash2 } from "lucide-react"
import { generarCodigoBarrasAleatorio, type CodigoBarrasItem } from "../../../services/codigoBarrasService"
import { I } from "./prodShared"

export function CodesEditor({ codes, setCodes }: { codes: CodigoBarrasItem[]; setCodes: (c: CodigoBarrasItem[]) => void }) {
  const [code, setCode] = useState("")
  const [qty, setQty] = useState("1")
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const n = /^\d+$/.test(qty.trim()) ? Number(qty.trim()) : 0
  const add = () => {
    const c = code.trim()
    if (!c || n < 1) return
    const i = codes.findIndex(x => x.codigo === c)
    setCodes(i >= 0 ? codes.map((x, k) => (k === i ? { ...x, cantidad: x.cantidad + n } : x)) : [...codes, { codigo: c, cantidad: n }])
    setCode(""); setQty("1"); ref.current?.focus()
  }
  const gen = async () => {
    setBusy(true)
    try { setCode((await generarCodigoBarrasAleatorio()).substring(0, 10)); ref.current?.focus() } finally { setBusy(false) }
  }
  return (
    <div className="ff s6">
      <span className="lb">Códigos de barras</span>
      {codes.map((c, i) => (
        <div className="codes" key={c.codigo}>
          <input className="in" readOnly value={c.codigo} aria-label={`Código de barras ${i + 1}`} />
          <input className="in num" readOnly value={c.cantidad} aria-label={`Cantidad del código ${i + 1}`} />
          <button type="button" className="ib" aria-label={`Quitar código ${i + 1}`} onClick={() => setCodes(codes.filter((_, k) => k !== i))}>{I(Trash2, 18)}</button>
        </div>
      ))}
      <div className="codes">
        <input ref={ref} className="in" value={code} onChange={e => setCode(e.target.value)} placeholder="Escanea o escribe el código" aria-label="Nuevo código de barras"
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add() } }} />
        <input className="in num" inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)} aria-label="Cantidad del código" />
        <button type="button" className="ib bd" aria-label="Generar código aleatorio" aria-disabled={busy} onClick={() => void gen()}>{I(Shuffle, 18)}</button>
      </div>
      <div className="rowx sb">
        <button type="button" className="btn out sm" onClick={add}>{I(Plus)}Agregar código</button>
        <span className="sub num">Total en códigos: {codes.reduce((s, c) => s + c.cantidad, 0)}</span>
      </div>
    </div>
  )
}
