import { useState } from "react"
import { ArrowLeft, FlaskConical, Info, Send, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { createCampaign, updateCampaign, type CommunityCampaign } from "../../../services/communityService"
import { Btn } from "./Btn"
import { ComposeForm, type FormErr, type FormVals } from "./ComposeForm"
import { DeleteDialog } from "./DeleteDialog"
import { MailPreview } from "./MailPreview"
import { ModeStrip } from "./ModeStrip"
import type { Status } from "./useComData"
import { I, MAX_SUBJECT, blockReason, errMsg, type MailFlags } from "./comShared"

export function Composer({ draft, mob, flags, status, onBack, onTest, onSend, onChanged }: {
  draft: CommunityCampaign | null; mob: boolean; flags: MailFlags | null; status: Status
  onBack: () => void; onTest: (c: CommunityCampaign) => void; onSend: (c: CommunityCampaign) => void; onChanged: () => void
}) {
  const [saved, setSaved] = useState<CommunityCampaign | null>(draft)
  const [vals, setVals] = useState<FormVals>({ subject: draft?.asunto || "", content: draft?.contenido || "" })
  const [err, setErr] = useState<FormErr>({})
  const [banner, setBanner] = useState("")
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<"w" | "p">("w")
  const [deleting, setDeleting] = useState(false)
  const set = (p: Partial<FormVals>) => { setVals(v => ({ ...v, ...p })); setErr({}); setBanner("") }
  const dirty = !saved || saved.asunto !== vals.subject || saved.contenido !== vals.content

  const save = async (): Promise<CommunityCampaign | null> => {
    const e: FormErr = {}
    if (!vals.subject.trim()) e.subject = "Escribe el asunto antes de guardar."
    else if (vals.subject.length > MAX_SUBJECT) e.subject = `El asunto supera los ${MAX_SUBJECT} caracteres.`
    if (!vals.content.trim()) e.content = "Escribe el mensaje antes de guardar."
    if (e.subject || e.content) { setErr(e); setBanner("No se pudo guardar el borrador. Corrige los campos marcados."); return null }
    setBusy(true)
    try {
      const body = { asunto: vals.subject, contenido: vals.content }
      const c = saved ? await updateCampaign(saved.id_campaign, body) : await createCampaign(body)
      const next = { ...(saved || {}), ...c } as CommunityCampaign
      setSaved(next)
      toast.success(saved ? "Borrador actualizado" : "Borrador guardado")
      onChanged()
      return next
    } catch (x) {
      setBanner(errMsg(x, "No se pudo guardar el borrador"))
      return null
    } finally { setBusy(false) }
  }
  const reason = !saved ? "Guarda el borrador para poder probarlo o enviarlo." : dirty ? "Guarda los cambios para probar o enviar la versión nueva." : blockReason(flags)
  const why = reason ? "com-why" : undefined
  const foot = (
    <div className="foot">
      {saved && <Btn cls="dx lf" icon={Trash2} onClick={() => setDeleting(true)} busy={busy}>Eliminar borrador</Btn>}
      {reason && <span className={`why${saved ? "" : " lf"}`} id="com-why">{I(Info, 14)}{reason}</span>}
      <Btn cls={saved && !dirty ? "out" : "main"} onClick={() => void save()} busy={busy}>Guardar borrador</Btn>
      <Btn cls="out" icon={FlaskConical} why={why} onClick={() => saved && onTest(saved)}>Enviar prueba</Btn>
      <Btn cls={reason ? "out" : "main"} icon={Send} why={why} onClick={() => saved && onSend(saved)}>Enviar…</Btn>
    </div>
  )
  const bannerEl = <div className="ban bad" role="alert">{I(Info, 18)}<div>{banner}</div></div>
  const form = <ComposeForm vals={vals} set={set} err={err} />
  const prev = <MailPreview vals={vals} />
  return (
    <div className={`pg${mob ? " fxp" : ""}`}>
      <div className="hd"><div className="l"><button type="button" className="ib bd" aria-label="Volver a Campañas" onClick={onBack}>{I(ArrowLeft, 18)}</button><h1>{saved ? "Editar borrador" : "Nueva campaña"}</h1></div></div>
      <ModeStrip flags={flags} status={status} />
      {mob && (
        <div className="tabrow"><div className="tabs" role="tablist" aria-label="Redactor">
          <button type="button" className="tab" role="tab" aria-selected={tab === "w"} onClick={() => setTab("w")}>Redactar</button>
          <button type="button" className="tab" role="tab" aria-selected={tab === "p"} onClick={() => setTab("p")}>Vista previa</button>
        </div></div>
      )}
      {mob ? (
        <>
          <div className="rcs">{banner && bannerEl}{tab === "w" ? form : prev}</div>
          {foot}
        </>
      ) : (
        <>{banner && bannerEl}<div className="cz">{form}{prev}</div>{foot}</>
      )}
      {deleting && saved && <DeleteDialog c={saved} onClose={() => setDeleting(false)} onDone={() => { setDeleting(false); onChanged(); onBack() }} />}
    </div>
  )
}
