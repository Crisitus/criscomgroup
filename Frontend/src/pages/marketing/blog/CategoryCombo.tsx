import { useEffect, useId, useRef, useState } from "react"
import { Check, ChevronDown, Plus } from "lucide-react"
import { I } from "./blogParts"
import { Q, norm } from "./blogCommon"

/** Combobox de categoría: filtra las existentes y ofrece crear una nueva. */
export function CategoryCombo({ value, cats, error, onChange }: { value: string; cats: string[]; error?: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const lb = useId()
  const q = value.trim()
  const ms = cats.filter(c => norm(c).includes(norm(q)))
  const exact = cats.some(c => norm(c) === norm(q))
  const items = [...ms.map(c => ({ v: c, mk: false })), ...(q && !exact ? [{ v: q, mk: true }] : [])]
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])
  const pick = (v: string) => { onChange(v); setOpen(false) }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setIdx(i => Math.min(i + 1, items.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === "Enter" && open && items[idx]) { e.preventDefault(); pick(items[idx].v) }
    else if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false) }
  }
  return (
    <div className="cbx" ref={box}>
      <input className={`inp${error ? " err" : ""}`} id="categoria" role="combobox" aria-expanded={open} aria-controls={lb} aria-autocomplete="list" autoComplete="off"
        aria-invalid={error ? true : undefined} aria-describedby={error ? "categoria-e" : undefined}
        value={value} onFocus={() => { setOpen(true); setIdx(0) }} onChange={e => { onChange(e.target.value); setOpen(true); setIdx(0) }} onKeyDown={onKey} />
      {I(ChevronDown, 16)}
      {open && items.length > 0 && (
        <ul className="lbx" role="listbox" id={lb} aria-label="Categorías">
          {items.map((it, i) => (
            <li key={`${it.mk}-${it.v}`} role="option" className={it.mk ? "mk" : undefined} aria-selected={i === idx} onMouseDown={e => { e.preventDefault(); pick(it.v) }}>
              {it.mk ? <>{I(Plus, 16)}Crear categoría {Q(it.v)}</> : <>{it.v}{norm(it.v) === norm(q) && <span style={{ marginLeft: "auto" }}>{I(Check, 16)}</span>}</>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
