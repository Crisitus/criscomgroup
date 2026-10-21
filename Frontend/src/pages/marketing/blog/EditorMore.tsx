import { Check, ChevronDown, CircleCheck, Globe, Info, Link as LinkIcon, TriangleAlert } from "lucide-react"
import type { BlogPost } from "../../../services/blogService"
import { Field, I, Msg } from "./blogParts"
import { SITE_HOST, trunc } from "./blogCommon"
import { previewSlug, type BlogForm } from "./blogForm"

export type EdProps = {
  f: BlogForm
  orig: BlogPost | null
  errors: Record<string, string>
  aviso: { msg: string; final: string; colision: boolean } | null
  set: <K extends keyof BlogForm>(k: K, v: BlogForm[K]) => void
}

export function EditorMore({ f, orig, errors: e, aviso, set, open, onToggle }: EdProps & { open: boolean; onToggle: (o: boolean) => void }) {
  const pub = orig?.estado === "publicado"
  const slugOff = pub && !f.cambiar
  const sl = previewSlug(f)
  const imgOk = f.imagen_url.trim() && !e.imagen_url && /^(https:\/\/|\/uploads\/)/.test(f.imagen_url.trim())
  const n1 = f.titulo.length, n2 = f.resumen.length
  const cambia = pub && f.cambiar && orig && sl !== orig.slug
  return (
    <details className="mr" open={open} onToggle={ev => onToggle((ev.target as HTMLDetailsElement).open)}>
      <summary>Dirección web, imagen y buscadores<small>/{sl}</small>{I(ChevronDown, 18, "cv")}</summary>
      <div className="in">
        <Field id="slug" label="Dirección web (slug)" count={{ t: `${f.slug.length}/180`, bad: !!e.slug }} error={e.slug}>
          <input className={`inp${e.slug ? " err" : ""}`} id="slug" value={f.slug} disabled={slugOff} placeholder="Se genera del título" autoComplete="off"
            aria-invalid={e.slug ? true : undefined} aria-describedby={e.slug ? "slug-e" : "slug-u"} onChange={ev => set("slug", ev.target.value)} />
          <p className="url" id="slug-u">{I(Globe, 16)}<span>{SITE_HOST}/blog/<b>{sl || "…"}</b></span></p>
          {pub && <label className="chk"><input type="checkbox" checked={f.cambiar} onChange={ev => set("cambiar", ev.target.checked)} /><span className="bx">{I(Check, 14)}</span>Cambiar la URL</label>}
          {pub && !f.cambiar && <Msg icon={LinkIcon}>La dirección no cambia mientras esté publicada.</Msg>}
        </Field>
        {aviso && (
          <div className="band warn" role="status"><div className="bt">{I(TriangleAlert, 18)}<span>{aviso.colision ? "Esa dirección ya existía" : "Aviso sobre la dirección web"}</span></div>
            <p>{aviso.msg} Dirección final: <b>{SITE_HOST}/blog/{aviso.final}</b></p></div>
        )}
        {cambia && (
          <div className="band warn" role="status"><div className="bt">{I(TriangleAlert, 18)}<span>Los enlaces a la dirección actual dejarán de funcionar</span></div>
            <p>No hay redirección: quien abra <b>{SITE_HOST}/blog/{orig!.slug}</b> verá un error. La nueva dirección será <b>{SITE_HOST}/blog/{sl}</b>.</p></div>
        )}
        <Field id="imagen_url" label="Imagen (URL)" count={{ t: `${f.imagen_url.length}/500`, bad: f.imagen_url.length > 500 }} error={e.imagen_url}>
          <input className={`inp${e.imagen_url ? " err" : ""}`} id="imagen_url" value={f.imagen_url} placeholder="https://… o /uploads/…" autoComplete="off"
            aria-invalid={e.imagen_url ? true : undefined} aria-describedby={e.imagen_url ? "imagen_url-e" : undefined} onChange={ev => set("imagen_url", ev.target.value)} />
          {imgOk && <><Msg tone="ok" icon={CircleCheck}>Dirección válida.</Msg><img className="ip" src={f.imagen_url.trim()} alt="Vista previa de la imagen" loading="lazy" onError={ev => { ev.currentTarget.style.display = "none" }} /></>}
        </Field>
        <Field id="palabras_clave" label="Palabras clave" error={e.palabras_clave}>
          <input className="inp" id="palabras_clave" value={f.palabras_clave} autoComplete="off" onChange={ev => set("palabras_clave", ev.target.value)} />
        </Field>
        <div className="f"><div className="lb"><span>Así se verá en Google</span></div>
          <div className="gp"><div className="gu">{SITE_HOST} › blog › {sl}</div><div className="gt">{trunc(f.titulo, 60) || "Título de la publicación"}</div><div className="gd">{trunc(f.resumen, 160)}</div></div>
          {n1 > 60 && <Msg icon={Info}>El título tiene <b>{n1}</b> caracteres: Google muestra los primeros 60.</Msg>}
          {n2 > 160 && <Msg icon={Info}>El resumen tiene <b>{n2}</b> caracteres: Google muestra los primeros 160.</Msg>}
        </div>
      </div>
    </details>
  )
}
