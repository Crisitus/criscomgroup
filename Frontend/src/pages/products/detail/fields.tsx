import { useId, type KeyboardEvent, type ReactNode } from "react"

/** Campo con etiqueta visible. Si hay error, se asocia con aria-describedby. */
export function Field({ label, cls = "", error, hint, children }: { label: ReactNode; cls?: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className={`fld ${cls}`}>
      <span>{label}</span>
      {children}
      {error ? <span className="why bad" role="alert">{error}</span> : hint}
    </label>
  )
}

/** Grupo de opciones excluyentes (radiogroup) con flechas de teclado. */
export function Opts<T extends string>({ label, items, value, onChange, cls = "" }: {
  label: string
  items: [T, string][]
  value: T
  onChange: (v: T) => void
  cls?: string
}) {
  const id = useId()
  const move = (e: KeyboardEvent, i: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = items[(i + step + items.length) % items.length][0]
    onChange(next)
    ;(e.currentTarget.parentElement?.querySelectorAll("button")[(i + step + items.length) % items.length] as HTMLElement | undefined)?.focus()
  }
  return (
    <div className={`fld ${cls}`}>
      <span id={id}>{label}</span>
      <div className="opts" role="radiogroup" aria-labelledby={id}>
        {items.map(([v, l], i) => (
          <button key={v} type="button" className="opt" role="radio" aria-checked={v === value} tabIndex={v === value ? 0 : -1} onClick={() => onChange(v)} onKeyDown={e => move(e, i)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}
