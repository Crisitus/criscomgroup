import { ArrowLeft, CircleAlert, CircleCheck, Pencil, RefreshCw, Trash2, TriangleAlert, X } from "lucide-react"
import type { BlogPost } from "../../../services/blogService"
import { Chip, Field, I } from "./blogParts"
import { ELL, Q, estadoDe, trunc } from "./blogCommon"
import { CategoryCombo } from "./CategoryCombo"
import { EditorMore, type EdProps } from "./EditorMore"
import { EditorPublish } from "./EditorPublish"

const LAB: Record<string, string> = { titulo: "Título", resumen: "Resumen", contenido: "Contenido", categoria: "Categoría", publicado_en: "Fecha de publicación", slug: "Dirección web", imagen_url: "Imagen", palabras_clave: "Palabras clave", estado: "Publicación" }
const TARGET: Record<string, string> = { publicado_en: "pf", estado: "pl" }
const SEC = ["slug", "imagen_url", "palabras_clave"]

type Props = EdProps & {
  mob: boolean; dirty: boolean; saving: boolean; savedAt: string | null; det: boolean
  cats: string[]; isNew: boolean
  onDet: (o: boolean) => void; onSave: () => void; onClose: () => void; onDelete: () => void
}

export function BlogEditor(p: Props) {
  const { f, orig, errors: e, set } = p
  const keys = Object.keys(e).filter(k => e[k])
  const n1 = f.titulo.length, n2 = f.resumen.length, n3 = f.contenido.length
  const np = f.contenido.split(/\n\s*\n/).filter(x => x.trim()).length
  const s = orig ? estadoDe(orig) : "borrador"
  const go = (k: string) => {
    if (SEC.includes(k)) p.onDet(true)
    setTimeout(() => { const el = document.getElementById(TARGET[k] || k); el?.scrollIntoView({ block: "center" }); el?.focus() }, 0)
  }
  const lab = p.isNew ? (f.mode === "p" ? "Guardar y programar" : f.mode === "a" ? "Guardar y publicar" : "Guardar borrador")
    : f.mode === "p" ? "Guardar y programar" : f.mode === "a" && s !== "publicado" ? "Guardar y publicar" : f.mode === "b" && orig?.estado === "publicado" ? "Guardar y despublicar" : "Guardar"
  const dty = p.dirty ? <span className="dty warn" role="status">{I(TriangleAlert, 16)}Cambios sin guardar</span>
    : p.savedAt ? <span className="dty ok" role="status">{I(CircleCheck, 16)}Guardado a las {p.savedAt}</span>
    : <span className="dty" id="nosave">Sin cambios por guardar</span>
  const off = !p.dirty || p.saving
  const area = (id: "titulo" | "resumen" | "contenido", rows: number, ph = "") => (
    <textarea className={`inp${e[id] ? " err" : ""}`} id={id} rows={rows} placeholder={ph} value={f[id]} aria-invalid={e[id] ? true : undefined} aria-describedby={e[id] ? `${id}-e` : undefined}
      onKeyDown={id === "titulo" ? ev => { if (ev.key === "Enter") ev.preventDefault() } : undefined} onChange={ev => set(id, id === "titulo" ? ev.target.value.replace(/\n/g, " ") : ev.target.value)} />
  )
  return (
    <section className="card ec" aria-label="Editor de publicación" aria-busy={p.saving || undefined}>
      <div className="eh">
        {p.mob && <button type="button" className="ib" aria-label="Volver a la lista" onClick={p.onClose}>{I(ArrowLeft, 20)}</button>}
        <h2>{p.isNew ? "Nueva publicación" : "Editar publicación"}</h2>{!p.isNew && <Chip e={s} />}
        {!p.mob && <button type="button" className="ib x" aria-label="Cerrar editor" onClick={p.onClose}>{I(X, 20)}</button>}
      </div>
      <div className="eb">
        {keys.length > 0 && (
          <div className="band bad" role="alert"><div className="bt">{I(CircleAlert, 18)}<span>No se pudo guardar: revisa {keys.length} campo{keys.length > 1 ? "s" : ""}</span></div>
            <nav className="jmp" aria-label="Ir al campo con error">{keys.map(k => <a key={k} href={`#${k}`} onClick={ev => { ev.preventDefault(); go(k) }}>{LAB[k] || k}</a>)}</nav></div>
        )}
        <Field id="titulo" label="Título" count={{ t: `${n1}/180 · mínimo 5`, bad: !!e.titulo || n1 < 5 || n1 > 180 }} error={e.titulo}>{area("titulo", n1 > 70 ? 2 : 1)}</Field>
        <Field id="resumen" label="Resumen" count={{ t: `${n2}/320 · mínimo 20`, bad: !!e.resumen || n2 < 20 || n2 > 320 }} error={e.resumen}>{area("resumen", 3)}</Field>
        <Field id="contenido" label="Contenido" count={{ t: `${np} párrafo${np !== 1 ? "s" : ""} · ${n3} caracteres · mínimo 80`, bad: !!e.contenido || n3 < 80 }} error={e.contenido}>
          {area("contenido", p.mob ? 7 : 6, "Texto plano. Separa los párrafos con una línea en blanco.")}
        </Field>
        <Field id="categoria" label="Categoría" error={e.categoria}><CategoryCombo value={f.categoria} cats={p.cats} error={e.categoria} onChange={v => set("categoria", v)} /></Field>
        <EditorPublish f={f} orig={orig} errors={e} set={set} />
        <EditorMore f={f} orig={orig} errors={e} aviso={p.aviso} set={set} open={p.det} onToggle={p.onDet} />
      </div>
      {p.mob && <div className="mobdty">{dty}</div>}
      <div className="ef">
        {!p.isNew && <button type="button" className="btn out sm" onClick={p.onDelete}>{I(Trash2, 16)}Eliminar</button>}
        <span className="sp" />{!p.mob && dty}
        <button type="button" className="btn" aria-disabled={off || undefined} aria-describedby={off ? "nosave" : undefined} onClick={() => { if (!off) p.onSave() }}>{p.saving ? <>{I(RefreshCw, 16, "spin")}Guardando{ELL}</> : lab}</button>
      </div>
    </section>
  )
}

export function EditorEmpty({ onNew }: { onNew: () => void }) {
  return <section className="card ec" aria-label="Editor de publicación"><div className="empty"><span className="ei">{I(Pencil, 22)}</span><h2>Elige una publicación</h2><p>Se abre aquí, junto a la lista, sin perder tu sitio. También puedes crear una nueva.</p><button type="button" className="btn out" onClick={onNew}>Nueva publicación</button></div></section>
}

export function EditorLoading({ post, onClose }: { post: BlogPost; onClose: () => void }) {
  const b = (w: number, h: number) => <span className="sk" style={{ display: "block", height: h, width: `${w}%` }} />
  const fk = (h: number, i: number) => <div className="f" style={{ gap: 8 }} key={i}>{b(22, 14)}{b(100, h)}</div>
  return (
    <section className="card ec" aria-label="Editor de publicación" aria-busy="true">
      <div className="eh"><h2>Editar publicación</h2><Chip e={estadoDe(post)} /><button type="button" className="ib x" aria-label="Cerrar editor" onClick={onClose}>{I(X, 20)}</button></div>
      <div className="eb"><p className="ctx" role="status">{I(RefreshCw, 16, "spin")}Cargando {Q(trunc(post.titulo, 48))}{ELL}</p>{[60, 84, 150, 44, 44].map(fk)}</div>
      <div className="ef"><button type="button" className="btn out sm" aria-disabled="true">{I(Trash2, 16)}Eliminar</button><span className="sp" /><span className="dty" id="ld">Disponible cuando cargue la publicación</span><button type="button" className="btn" aria-disabled="true" aria-describedby="ld">Guardar</button></div>
    </section>
  )
}
