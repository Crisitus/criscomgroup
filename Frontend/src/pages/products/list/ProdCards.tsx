import type { KeyboardEvent } from "react"
import { Dash, StockChips, Tags } from "./prodParts"
import { ProdMenu } from "./ProdMenu"
import type { ListProps } from "./ProdTable"
import { money, pct, type Row } from "./prodShared"

export function ProdCards({ rows, hl, ro, acts, menuId, setMenuId }: Omit<ListProps, "onView">) {
  const key = (r: Row) => (e: KeyboardEvent) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); acts.open(r) } }
  return (
    <div className="mlist">
      {rows.map(r => {
        const has = r.sin || r.bajo || r.inc
        return (
          <article key={r.id} className="mc" tabIndex={0} aria-label={`Abrir ficha de ${r.p.nombre}`} style={hl === r.id ? { borderColor: "hsl(var(--primary))" } : undefined} onClick={() => acts.open(r)} onKeyDown={key(r)}>
            <div className="m1">
              <div className="l"><span className="sku">{r.p.sku}</span><Tags r={r} /></div>
              <div className="pr">{r.offer !== null ? <><b className="num">{money(r.offer)}</b><span className="old num">{money(r.price)}</span></> : <b className="num">{money(r.price)}</b>}</div>
            </div>
            <div className="m2">
              <div className="nm">{r.p.nombre}</div>
              <div className="sk"><b className="num">{r.p.stock}</b><span className="num">{r.su > 0 ? `${r.su} sin ubicar` : "en stock"}</span></div>
            </div>
            {has && <div className="m3"><StockChips r={r} /></div>}
            <div className="m4">
              <div className="k">Costo prom.<b className="num">{r.costo > 0 ? money(r.costo) : <Dash label="Sin costo" />}</b></div>
              <div className="k">Margen<b className="num">{r.ck ? money(r.mu) : "Sin costo"}</b>{r.ck && r.mp !== null && <span className="num">{pct(r.mp)}</span>}</div>
              <div className="k">Mayorista<b className="num">{r.mayor !== null ? money(r.mayor) : <Dash label="Sin precio mayorista" />}</b></div>
              <ProdMenu r={r} ro={ro} acts={acts} openId={menuId} setOpenId={setMenuId} />
            </div>
          </article>
        )
      })}
    </div>
  )
}
