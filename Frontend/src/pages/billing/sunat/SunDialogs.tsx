import { Ban, TriangleAlert } from "lucide-react"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import type { EmisorSunat } from "../../../services/facturacionService"
import { I } from "./sunShared"
import type { Ctl } from "./SunEmitterCard"

const num = (n: number) => String(n).padStart(8, "0")

/** 409 requiere_confirmacion: la consecuencia exacta del cambio de series (reemplaza al window.confirm). */
export function SeriesDialog({ emisor, ctl }: { emisor?: EmisorSunat; ctl: Ctl }) {
  const ask = ctl.ask
  if (!ask) return null
  const busy = !!ctl.edit?.busy
  const rows: [string, string][] = []
  const fa = emisor?.serie_factura, bo = emisor?.serie_boleta
  rows.push(["Serie de factura", fa && fa !== ask.vals.serie_factura ? `${fa} → ${ask.vals.serie_factura}` : `${ask.vals.serie_factura} (sin cambios)`])
  rows.push(["Serie de boleta", bo && bo !== ask.vals.serie_boleta ? `${bo} → ${ask.vals.serie_boleta}` : `${ask.vals.serie_boleta} (sin cambios)`])
  rows.push(["Comprobantes ya emitidos", `${ask.comprobantes} · no se modifican`])
  const first = [fa !== ask.vals.serie_factura && `${ask.vals.serie_factura}-${num(1)}`, bo !== ask.vals.serie_boleta && `${ask.vals.serie_boleta}-${num(1)}`].filter(Boolean).join(" y ")
  if (first) rows.push(["Primer número nuevo", first])
  return (
    <ErpDialog open onOpenChange={o => { if (!o && !busy) ctl.closeAsk() }} title="Cambiar las series reiniciará el correlativo" icon={I(TriangleAlert, 22)}>
      <div className="pg-sunat dlgw">
        <p className="dp">Este emisor ya tiene <b className="num">{ask.comprobantes} {ask.comprobantes === 1 ? "comprobante emitido" : "comprobantes emitidos"}</b>. La serie nueva empieza otra vez en el correlativo 1.</p>
        <dl className="dl">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="num">{v}</dd></div>)}</dl>
        <p className="dp">Al guardar, este emisor queda habilitado y predeterminado.</p>
        <div className="acts">
          <button type="button" className="btn out" onClick={ctl.closeAsk} disabled={busy}>Volver a editar</button>
          <button type="button" className="btn" onClick={() => void ctl.save(true, ask.vals)} disabled={busy}>{busy ? "Guardando…" : "Cambiar series y guardar"}</button>
        </div>
      </div>
    </ErpDialog>
  )
}

/** Bloquear RUC 20: botón rojo solo dentro del diálogo, con la consecuencia exacta. */
export function Ruc20Dialog({ n, ctl }: { n: number; ctl: Ctl }) {
  if (!ctl.blockAsk) return null
  return (
    <ErpDialog open onOpenChange={o => { if (!o) ctl.closeBlock() }} title="Bloquear RUC 20" icon={I(Ban, 22)} tone="bad">
      <div className="pg-sunat dlgw">
        <p className="dp">Vas a bloquear <b>{n} {n === 1 ? "empresa" : "empresas"} con RUC 20</b>. Esto es lo que ocurre:</p>
        <ul className="dul">
          <li>Se les quita la <b>habilitación para facturar</b> y su condición de <b>emisor predeterminado</b>.</li>
          <li><b>No se borra</b> ninguna empresa ni ningún comprobante ya emitido.</li>
          <li>Desde esta pantalla <b>no se vuelven a habilitar</b>.</li>
        </ul>
        {ctl.blockErr && <div className="er4" role="alert" style={{ marginTop: 12 }}>{I(TriangleAlert, 16)}<div>{ctl.blockErr}</div></div>}
        <div className="acts">
          <button type="button" className="btn out" onClick={ctl.closeBlock} disabled={ctl.blockBusy}>Cancelar</button>
          <button type="button" className="btn dng" onClick={() => void ctl.doBlock()} disabled={ctl.blockBusy}>{I(Ban)}{ctl.blockBusy ? "Bloqueando…" : "Bloquear RUC 20"}</button>
        </div>
      </div>
    </ErpDialog>
  )
}
