import { useEffect, useState } from "react"
import { ddmm, leerFecha } from "./audCommon"

/** Fecha dd/mm/aaaa (hora de Lima): confirma solo cuando es valida o queda vacia. */
export function AudDateField({ label, aria, value, onChange }: { label: string; aria: string; value: string; onChange: (iso: string) => void }) {
  const [txt, setTxt] = useState(ddmm(value))
  const [bad, setBad] = useState(false)
  useEffect(() => { setTxt(ddmm(value)); setBad(false) }, [value])
  const edit = (v: string) => {
    setTxt(v)
    const iso = leerFecha(v)
    setBad(iso === null && v.trim().length >= 10)
    if (iso !== null && iso !== value) onChange(iso)
  }
  return (
    <label className="fld d" aria-invalid={bad}>
      <span>{label}</span>
      <input type="text" inputMode="numeric" aria-label={aria} placeholder="dd/mm/aaaa" value={txt} aria-invalid={bad}
        onChange={e => edit(e.target.value)} onBlur={() => { if (leerFecha(txt) === null) { setTxt(ddmm(value)); setBad(false) } }} />
    </label>
  )
}
