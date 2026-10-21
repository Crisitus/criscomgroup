import { useState } from "react"
import { AlertTriangle, Check, CheckCircle2, Clock, Lock, XCircle } from "lucide-react"
import { validateAffiliatePayment } from "../../../services/affiliateService"
import type { Rule } from "./usrRules"
import { fmtDT, limaMs, limaParts, moneda } from "./usrCommon"
import type { Actions } from "./useUsrActions"
import type { AffPayment, AffSettlement } from "./useUsrAffiliates"
import { Chip, Confirm, I, Why } from "./UsrParts"

const ESTADO = { pendiente: ["wn", Clock, "Pendiente"], vencido: ["er", XCircle, "Vencida"], pagado: ["ok", CheckCircle2, "Pagada"], anulado: ["nu", XCircle, "Anulada"] } as const
const PAGO = { pendiente: ["wn", Clock, "Pago pendiente"], validado: ["ok", CheckCircle2, "Pago validado"], rechazado: ["er", XCircle, "Pago rechazado"] } as const
const METODO: Record<string, string> = { transferencia: "Transferencia", efectivo: "Efectivo", otro: "Otro" }

function Pago({ p, s, can, act, onDone }: { p: AffPayment; s: AffSettlement; can: Rule; act: Actions; onDone: () => void }) {
  const [obs, setObs] = useState("")
  const [ask, setAsk] = useState<null | boolean>(null)
  const [t, ic, x] = PAGO[p.estado]
  const key = `pg${p.id_affiliate_payment}`
  const go = async (ok: boolean) => {
    const r = await act.run(key, () => validateAffiliatePayment(p.id_affiliate_payment, ok, obs.trim() || undefined), { title: ok ? "Pago validado" : "Pago rechazado", text: ok ? `La liquidación ${s.periodo} quedó pagada.` : "El afiliado deberá registrar otro pago." })
    if (r.ok) { setAsk(null); setObs(""); onDone() }
  }
  return (
    <div className="pago">
      <div className="l1"><Chip t={t} icon={ic} x={x} /><span>{METODO[p.metodo] ?? p.metodo} · <b>{p.referencia}</b> · <b className="num">{moneda(p.monto)}</b> · registrado el {fmtDT(p.creado_en)}</span></div>
      {p.estado === "pendiente" && (
        <>
          <div><label className="lab2" htmlFor={`o${key}`}>Observaciones (opcional)</label><textarea id={`o${key}`} className="inp" value={obs} maxLength={300} disabled={!can.ok} onChange={e => setObs(e.target.value)} /></div>
          <div className="acts">
            <button type="button" className="btn pri" aria-disabled={!can.ok} aria-describedby={!can.ok ? `w${key}` : undefined} onClick={() => { if (can.ok) setAsk(true) }}>{I(Check, 16)}Validar pago</button>
            <button type="button" className="btn out" aria-disabled={!can.ok} aria-describedby={!can.ok ? `w${key}` : undefined} onClick={() => { if (can.ok) setAsk(false) }}>Rechazar pago</button>
          </div>
          {!can.ok && <Why id={`w${key}`} icon={Lock}>{can.why}</Why>}
          {ask !== null && <Confirm danger={!ask} title={ask ? `¿Validar el pago de ${moneda(p.monto)}?` : "¿Rechazar este pago?"}
            text={ask ? `La liquidación ${s.periodo} pasa a Pagada y el negocio se reactiva si no quedan otras vencidas.` : "La liquidación sigue pendiente y el afiliado deberá registrar otro pago."}
            okLabel={ask ? "Validar pago" : "Rechazar pago"} busy={act.busy === key} onOk={() => void go(ask)} onCancel={() => setAsk(null)} />}
        </>
      )}
    </div>
  )
}

export function UsrSettlement({ s, can, act, onDone }: { s: AffSettlement; can: Rule; act: Actions; onDone: () => void }) {
  const [t, ic, x] = ESTADO[s.estado]
  const mes = limaParts(new Date()).date.slice(0, 7)
  const parcial = s.periodo === mes
  const hoy = limaParts(new Date(limaMs(s.vence_en))).date === limaParts(new Date()).date
  return (
    <div className={`tl${s.estado === "pagado" ? " done" : ""}`}>
      <div className="tlh">
        <h4>Periodo {s.periodo}</h4><Chip t={t} icon={ic} x={x} />
        {parcial ? <Chip t="wn" icon={AlertTriangle} x="Monto parcial" /> : s.periodo < mes && <Chip t="nu" icon={Lock} x="Periodo cerrado" />}
      </div>
      <div className="tlm">
        <div>Comisión<b className="big">{moneda(s.monto_comision)}</b></div>
        <div>Facturación válida<b>{moneda(s.facturacion_valida)}</b></div>
        <div>Vencimiento<b>{hoy ? "Hoy, " : ""}{fmtDT(s.vence_en)}</b>hora de Lima</div>
      </div>
      {parcial && <p className="hint" style={{ marginTop: 8 }}>Es el mes en curso: el monto es parcial y hay que regenerar la liquidación al cerrar el mes.</p>}
      {s.payments.map(p => <Pago key={p.id_affiliate_payment} p={p} s={s} can={can} act={act} onDone={onDone} />)}
    </div>
  )
}
