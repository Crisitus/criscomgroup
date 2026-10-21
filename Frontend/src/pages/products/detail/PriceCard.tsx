import type { Draft, Ficha } from "./types"
import type { Errors } from "./draft"
import { Field } from "./fields"
import { moneyOf, n2, net, r2 } from "./shared"
import { money } from "../../../components/erp/format"

export function PriceCard({ p, d, set, err, dk }: { p: Ficha; d: Draft; set: <K extends keyof Draft>(k: K, v: Draft[K]) => void; err: Errors; dk: Set<keyof Draft> }) {
  const precio = moneyOf(d.precio)
  const ok = precio > 0
  const costo = Number(p.costo_promedio) || 0
  const neto = ok ? r2(net(precio)) : 0
  const mg = ok ? neto - costo : 0
  const pct = ok && neto > 0 ? (mg / neto) * 100 : 0
  const antes = Number(p.precio_unitario_con_igv)
  const inCls = (k: keyof Draft) => `in num${dk.has(k) ? " dirty" : ""}`
  return (
    <section className="card" aria-labelledby="h-precios">
      <div className="ch"><h2 id="h-precios">Precios y margen</h2></div>
      <div className="g3">
        <Field label="Precio con IGV (S/)" error={err.precio} hint={dk.has("precio") ? <span className="hint">Antes {money(antes)}</span> : undefined}>
          <input className={inCls("precio")} inputMode="decimal" value={d.precio} aria-invalid={!!err.precio} onChange={e => set("precio", e.target.value)} onBlur={e => { const v = moneyOf(e.target.value); if (v > 0) set("precio", v.toFixed(2)) }} />
        </Field>
        <Field label="Mayorista con IGV (S/)" error={err.mayorista}>
          <input className={inCls("mayorista")} inputMode="decimal" placeholder="Sin precio" value={d.mayorista} aria-invalid={!!err.mayorista} onChange={e => set("mayorista", e.target.value)} onBlur={e => { const v = moneyOf(e.target.value); if (v > 0) set("mayorista", v.toFixed(2)) }} />
        </Field>
        <Field label="Precio neto (÷ 1.18)">
          <input className="in num" readOnly value={ok ? n2(neto) : ""} />
        </Field>
      </div>
      <div className="mny">
        <div><div className="l">Costo promedio</div><div className="v">{money(costo)}</div></div>
        <div><div className="l">Último costo</div><div className="v">{money(Number(p.ultimo_costo) || 0)}</div></div>
        <div className="mg">
          <div className="l">Margen neto</div>
          {costo > 0 && ok ? (
            <div className="v big" style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              {money(mg)}<span className="mut" style={{ fontSize: 13, fontWeight: 600 }}>{pct.toFixed(2)} %</span>
            </div>
          ) : (
            <div className="v" style={{ fontSize: 13, fontWeight: 500 }}>{costo > 0 ? "Indica un precio válido" : "Sin costo registrado"}</div>
          )}
        </div>
      </div>
    </section>
  )
}
