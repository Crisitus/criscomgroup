import { Calendar, Check, CircleCheck, ExternalLink, Globe, Pencil, TriangleAlert } from "lucide-react"
import { I, Msg } from "./blogParts"
import { SITE, SITE_HOST, daysTo, dtF, estadoDe, longF, type Mode } from "./blogCommon"
import { programadoLocal } from "./blogForm"
import type { EdProps } from "./EditorMore"

export function EditorPublish({ f, orig, errors: e, set }: Omit<EdProps, "aviso">) {
  const s = orig ? estadoDe(orig) : "borrador"
  const pub = orig ? orig.estado === "publicado" : false
  const opt = (k: Mode, l: string) => (
    <button type="button" key={k} className="opt" role="radio" aria-checked={f.mode === k} onClick={() => set("mode", k)}>{f.mode === k && I(Check, 16)}{l}</button>
  )
  let note
  if (f.mode === "b") note = pub ? <Msg tone="warn" icon={TriangleAlert}>Al guardar deja de verse en la web. Se conserva la fecha de publicación (<b>{orig?.publicado_en ? dtF(orig.publicado_en) : "—"}</b>) por si la vuelves a publicar.</Msg> : <Msg icon={Pencil}>Queda como borrador: no se ve en la web.</Msg>
  else if (f.mode === "a") note = s === "publicado" && orig?.publicado_en ? <Msg tone="ok" icon={CircleCheck}>Visible en la web desde el <b>{dtF(orig.publicado_en)}</b>.</Msg> : <Msg icon={Globe}>Saldrá en la web <b>en cuanto guardes</b>.</Msg>
  else {
    const loc = programadoLocal(f)
    note = (
      <>
        <div className="row2">
          <div className="f"><div className="lb"><label htmlFor="pf">Fecha</label></div><input className={`inp${e.publicado_en ? " err" : ""}`} type="date" id="pf" value={f.fecha} onChange={ev => set("fecha", ev.target.value)} aria-invalid={e.publicado_en ? true : undefined} aria-describedby={e.publicado_en ? "publicado_en-e" : undefined} /></div>
          <div className="f"><div className="lb"><label htmlFor="ph">Hora</label></div><input className="inp" type="time" id="ph" value={f.hora} onChange={ev => set("hora", ev.target.value)} /></div>
        </div>
        {e.publicado_en && <Msg tone="bad" icon={TriangleAlert} id="publicado_en-e">{e.publicado_en}</Msg>}
        {f.fecha && <Msg icon={Calendar}>Saldrá en la web el <b>{longF(loc)}</b>, hora de Lima (en {daysTo(loc)} días).</Msg>}
      </>
    )
  }
  const live = s === "publicado" && orig
  return (
    <div className="f">
      <div className="lb"><span id="pl">Publicación</span><span className="cnt">Hora de Lima (UTC−05:00)</span></div>
      <div className="seg" role="radiogroup" aria-labelledby="pl">{opt("b", pub ? "Despublicar" : "Borrador")}{opt("a", s === "publicado" ? "Publicado" : "Publicar ahora")}{opt("p", "Programar")}</div>
      {note}
      {live ? (
        <div className="vw"><a className="btn out sm" href={`${SITE}/blog/${orig.slug}`} target="_blank" rel="noreferrer">{I(ExternalLink, 16)}Ver en la web</a><span className="url">{SITE_HOST}/blog/<b>{orig.slug}</b></span></div>
      ) : (
        <div className="vw"><span className="btn out sm" role="link" aria-disabled="true" aria-describedby="vw-r">{I(ExternalLink, 16)}Ver en la web</span>
          <span className="why" id="vw-r">{s === "programado" && orig?.publicado_en ? `Aún no visible hasta ${dtF(orig.publicado_en)}` : "Aún es un borrador: no está en la web."}</span></div>
      )}
    </div>
  )
}
