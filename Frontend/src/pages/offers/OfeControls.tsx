import { useEffect, useState } from "react"
import { Minus, Plus } from "lucide-react"
import type { Mode } from "./ofeCalc"
import { I } from "./ofeShared"

export function ModeSeg({ mode, onMode }: { mode: Mode; onMode: (m: Mode) => void }) {
  return (
    <div className="seg" role="group" aria-label="Tipo de oferta">
      <button type="button" className="pre" aria-pressed={mode === "pct"} onClick={() => onMode("pct")}>Porcentaje</button>
      <button type="button" className="pre" aria-pressed={mode === "fix"} onClick={() => onMode("fix")}>Precio fijo</button>
    </div>
  )
}

export function Stepper({ pct, onChange }: { pct: number; onChange: (n: number) => void }) {
  const [txt, setTxt] = useState(String(pct))
  useEffect(() => setTxt(String(pct)), [pct])
  return (
    <div className="step" role="group" aria-label="Porcentaje de descuento">
      <button type="button" aria-label="Bajar 1 %" onClick={() => onChange(pct - 1)}>{I(Minus, 16)}</button>
      <input
        inputMode="numeric" aria-label="Porcentaje (1 a 99)" value={txt}
        onChange={e => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 2)
          setTxt(v)
          if (v !== "" && Number(v) >= 1) onChange(Number(v))
        }}
        onBlur={() => setTxt(String(pct))}
      />
      <span className="u">%</span>
      <button type="button" aria-label="Subir 1 %" onClick={() => onChange(pct + 1)}>{I(Plus, 16)}</button>
    </div>
  )
}
