import { ArrowRight, CircleHelp, RefreshCw, ShieldCheck, TriangleAlert, X, CircleAlert } from "lucide-react"
import { ErpDrawer } from "../../components/erp/ErpDialog"
import { MINUS, SEP, applyReason, fp, mgs, money, plu, summary, type Mode, type OfeRow } from "./ofeCalc"
import { Chip, I } from "./ofeShared"
import { ModeSeg, Stepper } from "./OfeControls"

interface Props {
  rows: OfeRow[]; mode: Mode; pct: number; fix: Record<number, string>; off: boolean; busy: boolean; mob: boolean
  onMode: (m: Mode) => void; onPct: (n: number) => void; onClose: () => void; onConfirm: () => void
}

export function OfePreview({ rows, mode, pct, fix, off, busy, mob, onMode, onPct, onClose, onConfirm }: Props) {
  const S = summary(rows, mode, pct, fix)
  const fx = mode === "fix"
  const why = applyReason(off, S, mode)
  const blocked = !!why || busy || S.n === 0
  return (
    <ErpDrawer open onOpenChange={o => { if (!o) onClose() }} label="Vista previa de la oferta">
      <div className="pg-ofe dlgw drw">
        <div className="ph2">
          <div><h3>Vista previa de la oferta</h3><span className="sub">{fx ? "Precio fijo con IGV" : `Porcentaje ${pct} %`}{SEP}{plu(S.n, "producto", "productos")}</span></div>
          <button type="button" className="ib" aria-label="Cerrar vista previa" onClick={onClose}>{I(X, 20)}</button>
        </div>
        <div className="pbody">
          {mob && (
            <div className="ctl" style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              <ModeSeg mode={mode} onMode={onMode} />
              {fx ? <span className="sub" style={{ whiteSpace: "normal" }}>Escribe el precio con IGV de cada producto en su tarjeta.</span> : <Stepper pct={pct} onChange={onPct} />}
            </div>
          )}
          <div className="sum3">
            <div><div className="k">Precio medio</div><div className="v num">{S.avg === null ? "—" : money(S.avg)}</div></div>
            <div><div className="k">Ahorro total</div><div className="v num">{money(S.save)}</div></div>
            <div><div className="k">Margen mínimo</div><div className="v num">{S.min === null ? "Sin costo" : mgs(S.min)}</div></div>
          </div>
          <p className="atom">{I(ShieldCheck, 16)}<span><b>Es atómico:</b> si una fila falla, no se aplica ninguna. El precio cambia al instante en la tienda web y en caja.</span></p>
          <ul>
            {S.cs.map(({ r, c }) => (
              <li key={r.id} className={`pv${c.err ? " errp" : ""}`}>
                <div className="t"><span className="nm">{r.p.nombre}</span><span className="sub">{r.p.sku}</span></div>
                {c.err || c.price === undefined || c.pct === undefined ? (
                  <>
                    <div className="pr2"><s className="num">{money(r.normal)}</s>{I(ArrowRight, 14)}<b className="nw">Sin cambios</b></div>
                    <div className="w3"><Chip k="bad" icon={CircleAlert} t={c.noprice ? "No admite oferta" : "Precio inválido"} /><span>{c.err}</span></div>
                  </>
                ) : (
                  <>
                    <div className="pr2"><s className="num">{money(r.normal)}</s>{I(ArrowRight, 14)}<b className="nw num">{money(c.price)}</b><span className="tag acc num">{MINUS}{fp(c.pct).replace(MINUS, "")}</span></div>
                    <div className="w3">
                      <span className="num">Ahorro {money(c.save || 0)}</span>
                      {r.cost === null || c.m === null || c.m === undefined
                        ? (c.nocost ? <Chip k="neu" icon={CircleHelp} t="Sin costo" /> : null)
                        : c.below
                          ? <><Chip k="bad" icon={TriangleAlert} t="Bajo el costo" /><span className="num">margen {mgs(c.m)}{SEP}costo con IGV {money((r.cost || 0) * 1.18)}</span></>
                          : <span className="num">margen {mgs(c.m)}</span>}
                      {c.rep && <span className="tag acc">{I(RefreshCw, 12)}{c.rep}</span>}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="pfoot">
          <button type="button" className="btn out" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn pr" aria-disabled={blocked || undefined} aria-describedby={why ? "pv-why" : undefined} onClick={() => { if (!blocked) onConfirm() }}>
            Confirmar y aplicar a {S.n}
          </button>
        </div>
        {why && <p id="pv-why" className="pwhy">{I(CircleAlert, 16)}{why}</p>}
      </div>
    </ErpDrawer>
  )
}
