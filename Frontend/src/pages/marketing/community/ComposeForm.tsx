import { useRef } from "react"
import { Braces, CircleAlert } from "lucide-react"
import { I, MAX_SUBJECT } from "./comShared"

export interface FormVals { subject: string; content: string }
export type FormErr = { subject?: string; content?: string }

export function ComposeForm({ vals, set, err }: { vals: FormVals; set: (v: Partial<FormVals>) => void; err: FormErr }) {
  const ta = useRef<HTMLTextAreaElement>(null)
  const over = vals.subject.length > MAX_SUBJECT
  const insert = () => {
    const el = ta.current
    const a = el ? el.selectionStart : vals.content.length
    const b = el ? el.selectionEnd : vals.content.length
    const next = vals.content.slice(0, a) + "{{nombre}}" + vals.content.slice(b)
    set({ content: next })
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(a + 10, a + 10) })
  }
  return (
    <div className="pan">
      <div className="sec">
        <div className="lb"><label htmlFor="com-asunto">Asunto</label><span className={`cnt${over ? " bad" : ""}`}>{vals.subject.length}/{MAX_SUBJECT}</span></div>
        <input className={`in${over || err.subject ? " er" : ""}`} id="com-asunto" value={vals.subject} placeholder="Asunto del correo" aria-invalid={over || !!err.subject || undefined} onChange={e => set({ subject: e.target.value })} />
        {(over || err.subject) && <div className="err">{I(CircleAlert, 14)}{over ? `El asunto supera los ${MAX_SUBJECT} caracteres (${vals.subject.length}).` : err.subject}</div>}
      </div>
      <div className="sec">
        <div className="lb"><label htmlFor="com-msg">Mensaje</label><span className="cnt">{vals.content.length} caracteres</span></div>
        <div><button type="button" className="btn out sm" onClick={insert}>{I(Braces, 16)}Insertar {"{{nombre}}"}</button></div>
        <textarea ref={ta} className={`ta${err.content ? " er" : ""}`} id="com-msg" value={vals.content} placeholder="Escribe el saludo y el mensaje…" aria-invalid={!!err.content || undefined} onChange={e => set({ content: e.target.value })} />
        {err.content && <div className="err">{I(CircleAlert, 14)}{err.content}</div>}
        <span className="sub">{"{{nombre}}"} se reemplaza en asunto y mensaje. El saludo lo escribes tú: el servidor no añade ninguno.</span>
      </div>
    </div>
  )
}
