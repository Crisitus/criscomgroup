import { useState } from "react"
import { renderName } from "./comShared"
import type { FormVals } from "./ComposeForm"

const EX = { named: { label: "Irma", name: "Irma", email: "irma@example.invalid" }, anon: { label: "Sin nombre", name: "miembro de CRISCOM", email: "miembro@example.invalid" } }

export function MailPreview({ vals }: { vals: FormVals }) {
  const [who, setWho] = useState<keyof typeof EX>("named")
  const ex = EX[who]
  const empty = !vals.subject && !vals.content
  return (
    <div className="pan">
      <div className="sec" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <h2>Vista previa</h2>
        <div className="seg" role="group" aria-label="Destinatario de ejemplo">
          {(Object.keys(EX) as (keyof typeof EX)[]).map(k => <button type="button" key={k} aria-pressed={who === k} onClick={() => setWho(k)}>{EX[k].label}</button>)}
        </div>
      </div>
      {empty ? <div className="sec ph0">El correo aparecerá aquí cuando escribas el asunto y el mensaje.</div> : (
        <>
          <div className="sec"><dl className="ml"><dt>Para</dt><dd>{ex.label === "Irma" ? `Irma · ${ex.email}` : `Sin nombre · ${ex.email}`}</dd><dt>Asunto</dt><dd className="fw6">{vals.subject ? renderName(vals.subject, ex.name) : <span className="ph0">(sin asunto)</span>}</dd></dl></div>
          <div className="sec">{vals.content ? <div className="body">{renderName(vals.content, ex.name)}</div> : <span className="ph0">(sin mensaje)</span>}</div>
          <div className="sec"><span className="sub">Pie que añade cada correo:</span><u className="fw6" style={{ color: "hsl(var(--primary))" }}>Darme de baja</u></div>
        </>
      )}
    </div>
  )
}
