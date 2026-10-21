import { useState } from "react"
import { CalendarPlus, CheckCircle2, Clock, Lock, PauseCircle, Store } from "lucide-react"
import { generateSettlement } from "../../../services/affiliateService"
import { canLiquidate, type Actor } from "./usrRules"
import { enPrueba, fmtD, fmtDT, limaParts, moneda } from "./usrCommon"
import { useUsrActions } from "./useUsrActions"
import type { AffBusiness } from "./useUsrAffiliates"
import { Alert, Chip, I, Spin, Why } from "./UsrParts"
import { UsrSettlement } from "./UsrSettlement"

export const BizChips = ({ b }: { b: AffBusiness }) => (
  <>
    <Chip t={b.estado === "activo" ? "ok" : b.estado === "suspendido" ? "wn" : "nu"} icon={b.estado === "activo" ? CheckCircle2 : b.estado === "suspendido" ? PauseCircle : Store} x={b.estado[0].toUpperCase() + b.estado.slice(1)} />
    {enPrueba(b.prueba_finaliza_en) && <Chip t="wn" icon={Clock} x={`En prueba hasta ${fmtD(b.prueba_finaliza_en)}`} />}
  </>
)

const meses = () => {
  const [y, m] = limaParts(new Date()).date.split("-").map(Number)
  return [0, 1, 2].map(i => { const d = new Date(y, m - 1 - i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` })
}

export function UsrAffDetail({ b, owner, actor, onChanged }: { b: AffBusiness; owner: string; actor: Actor; onChanged: () => void }) {
  const act = useUsrActions()
  const [per, setPer] = useState(meses()[0])
  const prueba = enPrueba(b.prueba_finaliza_en)
  const can = canLiquidate(actor)
  const why = !can.ok ? can.why : prueba ? `El negocio está en su prueba gratuita hasta ${fmtD(b.prueba_finaliza_en)}: todavía no se liquida.` : ""
  const parcial = per === meses()[0]
  const gen = async () => {
    const r = await act.run("gen", () => generateSettlement(b.id_affiliate_business, per),
      { title: "Liquidación generada", text: parcial ? `Periodo ${per} con monto parcial: vuelve a generarla al cerrar el mes.` : `Periodo ${per} liquidado.` })
    if (r.ok) onChanged()
  }
  const S = b.summary
  const filas: [string, string | number][] = [["Ventas", S.ventas], ["Neto", moneda(S.neto)], ["Unidades en stock", S.unidades_stock], ["Valor del stock", moneda(S.valor_stock)], ["Compras", S.compras], ["Cotizaciones", S.cotizaciones], ["Servicios", S.servicios]]
  return (
    <section className="sp" aria-label={`Negocio ${b.nombre_comercial}`}>
      <div className="dh">
        <div className="dh1"><h2>{b.nombre_comercial}</h2><BizChips b={b} /></div>
        <p className="dh2">Dueño: {owner} · comisión {Number(b.comision_porcentaje)} % · prueba desde el {fmtDT(b.prueba_inicia_en)} (hora de Lima)</p>
      </div>
      <div className="ad">
        <div className="adl">
          <div><h3>Resumen</h3><dl className="rs2">{filas.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></div>
          <div className="rg">
            <h3>Generar liquidación</h3>
            <label className="lab2" htmlFor="usr-per">Periodo</label>
            <select id="usr-per" className="inp" value={per} onChange={e => setPer(e.target.value)}>
              {meses().map((m, i) => <option key={m} value={m}>{m}{i === 0 ? " · mes en curso (monto parcial)" : ""}</option>)}
            </select>
            <button type="button" className="btn pri" aria-disabled={!!why || act.busy === "gen"} aria-describedby={why ? "usr-gen-why" : undefined} onClick={() => { if (!why) void gen() }}>
              {act.busy === "gen" ? <Spin /> : I(CalendarPlus, 16)}Generar liquidación {per}
            </button>
            {why && <Why id="usr-gen-why" icon={Lock}>{why}</Why>}
            {!why && parcial && <Why>El mes en curso se liquida con monto parcial.</Why>}
          </div>
          {act.banner && <Alert b={act.banner} onClose={act.clear} />}
        </div>
        <div className="adr">
          <h3>Liquidaciones</h3>
          {b.settlements.length === 0 ? <p className="hint">Sin liquidaciones. {prueba ? `Se generan desde el fin de la prueba (${fmtD(b.prueba_finaliza_en)}).` : ""}</p>
            : [...b.settlements].sort((x, y) => y.periodo.localeCompare(x.periodo)).map(s => <UsrSettlement key={s.id_settlement} s={s} can={can} act={act} onDone={onChanged} />)}
        </div>
      </div>
    </section>
  )
}
