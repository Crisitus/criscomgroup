import type { Category, Draft } from "./types"
import type { Errors } from "./draft"
import { Field } from "./fields"
import { ImageBox } from "./ImageBox"

export function DataCard({ d, set, err, cats, dk, img }: {
  d: Draft
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void
  err: Errors
  cats: Category[]
  dk: Set<keyof Draft>
  img: Parameters<typeof ImageBox>[0]
}) {
  const cls = (k: keyof Draft) => `in${dk.has(k) ? " dirty" : ""}`
  return (
    <section className="card" aria-labelledby="h-datos">
      <div className="ch"><h2 id="h-datos">Datos</h2></div>
      <div className="dat">
        <div className="gd">
          <Field label="SKU" cls="f-sku" error={err.sku}>
            <input className={`${cls("sku")} mono`} value={d.sku} aria-invalid={!!err.sku} onChange={e => set("sku", e.target.value)} />
          </Field>
          <Field label="Nombre" cls="f-nom" error={err.nombre}>
            <input className={cls("nombre")} value={d.nombre} aria-invalid={!!err.nombre} onChange={e => set("nombre", e.target.value)} />
          </Field>
          <Field label="Categoría" cls="f-cat" error={err.categoria}>
            <select className={`sl${dk.has("categoria") ? " dirty" : ""}`} value={d.categoria} aria-invalid={!!err.categoria} onChange={e => set("categoria", e.target.value)}>
              {d.categoria === "" && <option value="">Elige una categoría</option>}
              {cats.map(c => <option key={c.id_categoria} value={String(c.id_categoria)}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="Descripción" cls="f-des">
            <input className={cls("descripcion")} value={d.descripcion} onChange={e => set("descripcion", e.target.value)} />
          </Field>
        </div>
        <ImageBox {...img} />
      </div>
    </section>
  )
}
