import { Info, Lock, Star } from "lucide-react"
import type { AdquirentePos } from "../../../services/posService"
import type { PagPosCtl } from "./usePagPos"
import { Btn, I } from "./pagCommon"
import { CANAL, SEP } from "./pagData"
import { EmptyBlk, ErrCard, SkCard } from "./PagStates"

function Row({ a, c }: { a: AdquirentePos; c: PagPosCtl }) {
  const sid = `pag-sw-${a.id_adquirente}`
  const busy = c.busy === a.id_adquirente
  return (
    <div className="pa-ad">
      <div className="pa-l1">
        <span className="pa-nm">{a.nombre}{a.predeterminado && <span className="pa-st pa-neu">{I(Star, 14)}Principal</span>}</span>
        <button type="button" className="pa-sw" role="switch" aria-checked={a.activo} aria-disabled={a.predeterminado || busy || undefined}
          aria-describedby={a.predeterminado ? sid : undefined} onClick={() => { if (!a.predeterminado && !busy) void c.toggle(a) }}>
          <span className="pa-tr" />Activo
        </button>
      </div>
      <div className="pa-chs">{(a.canales ?? []).map(k => <span className="pa-tag" key={k}>{CANAL[k] ?? k}</span>)}</div>
      <p className="pa-meta">
        {a.marca ? `${a.marca}${SEP}` : ""}Confirmación {a.modo_confirmacion === "manual" ? "manual" : "por API"}{a.requiere_referencia ? `${SEP}Referencia obligatoria` : ""}
        {a.link_pago_url ? <>{SEP}Enlace de pago: <span className="pa-mono">{a.link_pago_url.replace(/^https?:\/\//, "")}</span></> : null}
      </p>
      {a.predeterminado
        ? <p className="pa-eff" id={sid} style={{ margin: 0 }}>{I(Lock)}No se puede desactivar el principal: es el único que registra pagos nuevos. Haz principal a otro adquirente para poder desactivarlo.</p>
        : <div>
            <p className="pa-eff" style={{ margin: "0 0 8px" }}>{I(Info)}No registra pagos nuevos: solo el principal los registra.</p>
            <Btn out icon={I(Star)} onClick={() => c.setConfirm(a.id_adquirente)} busy={busy}>Hacer principal</Btn>
            {c.confirm === a.id_adquirente && (
              <div className="pa-cf" role="group" aria-label="Confirmar cambio de principal">
                <p><b>¿Hacer principal a {a.nombre}?</b> {a.nombre} quedará activo y registrará los pagos nuevos.{c.main ? ` ${c.main.nombre} dejará de ser el principal y ya no registrará pagos nuevos.` : ""}</p>
                <div className="pa-r"><Btn busy={busy} onClick={() => void c.makeMain(a)}>Sí, hacer principal</Btn><Btn out onClick={() => c.setConfirm(null)}>Cancelar</Btn></div>
              </div>
            )}
          </div>}
      {c.errors[a.id_adquirente] && <p className="pa-why pa-bad" role="alert">{c.errors[a.id_adquirente]}</p>}
    </div>
  )
}

export function PagPos({ c }: { c: PagPosCtl }) {
  const { blk } = c
  if (blk.status === "load") return <SkCard title="Cobros físicos (POS)" rows={2} />
  if (blk.status !== "ok") return <ErrCard title="Cobros físicos (POS)" what="los adquirentes POS" code={blk.code} message={blk.message} onRetry={blk.retry} />
  return (
    <section className="pa-card pa-clip" aria-labelledby="pag-h-pos">
      <div className="pa-ch"><h2 id="pag-h-pos">Cobros físicos (POS)</h2><span className="pa-nt">{c.rows.length} adquirente{c.rows.length === 1 ? "" : "s"}{SEP}{c.main ? "1 principal" : "sin principal"}</span></div>
      {c.rows.length === 0 && <EmptyBlk title="Aún no hay adquirentes">Cuando se configure un adquirente para la tienda física aparecerá aquí. Esto no es un error.</EmptyBlk>}
      {c.rows.map(a => <Row key={a.id_adquirente} a={a} c={c} />)}
    </section>
  )
}
