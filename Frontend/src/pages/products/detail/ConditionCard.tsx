import type { Draft } from "./types"
import type { Errors } from "./draft"
import { Field, Opts } from "./fields"

const WARRANTY = { nuevo: "12", segunda_mano: "3" } as const

export function ConditionCard({ d, set, err, dk }: { d: Draft; set: <K extends keyof Draft>(k: K, v: Draft[K]) => void; err: Errors; dk: Set<keyof Draft> }) {
  const inCls = (k: keyof Draft) => `in num${dk.has(k) ? " dirty" : ""}`
  /** Al cambiar la condicion se sugiere su garantia habitual, solo si no se habia personalizado. */
  const setCond = (v: Draft["condicion"]) => {
    if (d.garantia === WARRANTY[d.condicion]) set("garantia", WARRANTY[v])
    set("condicion", v)
  }
  return (
    <section className="card" aria-labelledby="h-condicion">
      <div className="ch"><h2 id="h-condicion">Condición y garantía</h2></div>
      <div className="g4">
        <Opts label="Condición" cls="c-con" value={d.condicion} onChange={setCond} items={[["nuevo", "Nuevo"], ["segunda_mano", "Segunda mano"]]} />
        <Opts label="Origen" cls="c-ori" value={d.origen} onChange={v => set("origen", v)} items={[["local", "Local"], ["importado", "Importado"]]} />
        <Field label="Garantía (meses)" error={err.garantia}>
          <input className={inCls("garantia")} inputMode="numeric" value={d.garantia} aria-invalid={!!err.garantia} onChange={e => set("garantia", e.target.value)} />
        </Field>
        <Field label="Stock mínimo" error={err.minimo}>
          <input className={inCls("minimo")} inputMode="numeric" value={d.minimo} aria-invalid={!!err.minimo} onChange={e => set("minimo", e.target.value)} />
        </Field>
      </div>
      <Field label="Observaciones de estado">
        <input className={`in${dk.has("obs") ? " dirty" : ""}`} value={d.obs} onChange={e => set("obs", e.target.value)} />
      </Field>
    </section>
  )
}
