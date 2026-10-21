import { useEffect, useId, useMemo, useRef, useState } from "react"
import type { AuditCatalogo } from "../../services/auditLogService"

type Usr = AuditCatalogo["usuarios"][number]
const plano = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

/** Selector de usuario con busqueda por nombre o correo (combobox accesible). */
export function AudUserBox({ value, usuarios, onPick, wide }: { value: string; usuarios: Usr[]; onPick: (id: string) => void; wide?: boolean }) {
  const actual = usuarios.find(u => String(u.id) === value)
  const [txt, setTxt] = useState(actual?.name ?? "")
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const box = useRef<HTMLLabelElement>(null)
  const lid = useId()

  useEffect(() => { setTxt(actual?.name ?? ""); if (!value) setOpen(false) }, [value, actual?.name])
  const lista = useMemo(() => {
    const q = plano(open && txt !== actual?.name ? txt : "")
    return usuarios.filter(u => !q || plano(`${u.name} ${u.email ?? ""}`).includes(q)).slice(0, 50)
  }, [usuarios, txt, open, actual?.name])

  useEffect(() => {
    if (!open) return
    const out = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) { setOpen(false); setTxt(actual?.name ?? "") } }
    document.addEventListener("pointerdown", out)
    return () => document.removeEventListener("pointerdown", out)
  }, [open, actual?.name])

  const pick = (u: Usr | null) => { onPick(u ? String(u.id) : ""); setTxt(u?.name ?? ""); setOpen(false) }
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi(h => Math.min(h + 1, lista.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi(h => Math.max(h - 1, 0)) }
    else if (e.key === "Enter" && open && lista[hi]) { e.preventDefault(); pick(lista[hi]) }
    else if (e.key === "Escape") { setOpen(false); setTxt(actual?.name ?? "") }
  }

  return (
    <label className={`fld u${wide ? " w" : ""}`} ref={box}>
      <input type="text" role="combobox" aria-expanded={open} aria-controls={lid} aria-autocomplete="list" aria-label="Usuario (buscar por nombre o correo)"
        placeholder={wide ? "Buscar por nombre o correo" : "Usuario"} value={txt} autoComplete="off"
        onChange={e => { setTxt(e.target.value); setOpen(true); setHi(0); if (!e.target.value && value) onPick("") }}
        onFocus={() => setOpen(true)} onKeyDown={key} />
      {open && (
        <div className="ucb" id={lid} role="listbox" aria-label="Usuarios">
          <button type="button" role="option" aria-selected={!value} onMouseDown={e => e.preventDefault()} onClick={() => pick(null)}><b>Todos los usuarios</b></button>
          {lista.map((u, i) => (
            <button key={u.id} type="button" role="option" aria-selected={i === hi} onMouseDown={e => e.preventDefault()} onClick={() => pick(u)}>
              <b>{u.name}</b><span className="sub">{u.email ?? ""}</span>
            </button>
          ))}
          {!lista.length && <div className="none">Ningún usuario coincide.</div>}
        </div>
      )}
    </label>
  )
}
