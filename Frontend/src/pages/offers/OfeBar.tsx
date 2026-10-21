import { CircleAlert, CircleHelp, RefreshCw, Trash2, TriangleAlert } from "lucide-react"
import { applyReason, money, mgs, plu, type Mode, type Summ } from "./ofeCalc"
import { Chip, I } from "./ofeShared"
import { ModeSeg, Stepper } from "./OfeControls"

export interface BarProps {
  S: Summ; mode: Mode; pct: number; off: boolean; busy: boolean
  /** total del filtro cuando toda la página está marcada */
  filterTotal: number | null
  onMode: (m: Mode) => void; onPct: (n: number) => void
  onClear: () => void; onAll: () => void; onApply: () => void; onQuit: () => void
}

export function OfeBar({ S, mode, pct, off, busy, filterTotal, onMode, onPct, onClear, onAll, onApply, onQuit }: BarProps) {
  const fx = mode === "fix"
  const n = S.n
  const why = applyReason(off, S, mode)
  const noQuit = off || S.withOffer === 0 || busy
  const cnt = filterTotal !== null && filterTotal > n
    ? <><b className="num">{n} de {filterTotal}</b>&nbsp;seleccionados</>
    : <><b className="num">{n}</b>&nbsp;{n === 1 ? "seleccionado" : "seleccionados"}</>
  return (
    <section className="abar" aria-label="Aplicar oferta a la selección">
      <div className="ab1">
        <span className="cnt">{cnt}</span>
        <button type="button" className="lnk" onClick={onClear}>Limpiar</button>
        <ModeSeg mode={mode} onMode={onMode} />
        {fx ? <span className="fx">Precio con IGV de cada producto, en su fila</span> : <Stepper pct={pct} onChange={onPct} />}
        <span className="sp" />
        <button
          type="button" className="btn out sm dn" aria-disabled={noQuit || undefined}
          aria-describedby={noQuit ? (off ? "off-msg" : "q-why") : undefined}
          onClick={() => { if (!noQuit) onQuit() }}
        >{I(Trash2, 16)}Quitar ofertas de {n}</button>
        <button
          type="button" className="btn" aria-disabled={!!why || busy || undefined} aria-describedby={why ? "ap-why" : undefined}
          onClick={() => { if (!why && !busy) onApply() }}
        >Aplicar a {n}</button>
      </div>
      <div className="ab2">
        {filterTotal !== null && filterTotal > n && <button type="button" className="lnk" onClick={onAll}>Seleccionar los {filterTotal} del filtro</button>}
        {why ? <span className="why" id="ap-why">{I(CircleAlert, 16)}{why}</span> : (
          <>
            {S.ok.length ? (
              <>
                <b className="num">{plu(S.ok.length, "producto", "productos")}</b>
                <span>precio medio final <b className="num">{money(S.avg || 0)}</b></span>
                <span>margen mínimo <b className="num">{S.min === null ? "sin costo registrado" : mgs(S.min)}</b></span>
              </>
            ) : <b className="num">{plu(n, "producto", "productos")}</b>}
            {S.below > 0 && <Chip k="bad" icon={TriangleAlert} t={`${S.below} bajo el costo`} />}
            {S.nocost > 0 && <Chip k="neu" icon={CircleHelp} t={`${S.nocost} sin costo`} />}
            {S.rep > 0 && <span className="tag acc">{I(RefreshCw, 12)}{S.rep} {S.rep > 1 ? "reemplazan" : "reemplaza"} oferta</span>}
          </>
        )}
        {!off && S.withOffer === 0 && <span id="q-why">Quitar ofertas: ningún producto seleccionado tiene oferta.</span>}
      </div>
    </section>
  )
}
