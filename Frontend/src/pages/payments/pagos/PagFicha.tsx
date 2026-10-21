import type { GatewayCatalogItem, PaymentGateway } from "../../../services/paymentGatewayService"
import type { PagFichaCtl } from "./usePagFicha"
import { Btn, Stat } from "./pagCommon"
import { fdate } from "./pagData"
import { ProbarBlock, UsarBlock } from "./PagFichaActions"
import { EnvBlock, KeyField, OriginBlock, WebhookBlock } from "./PagFichaKeys"
import { PagResult } from "./PagResult"

const WEBHOOK = "/api/pedidos/webhooks/culqi"

export function FichaHead({ item, gw }: { item: GatewayCatalogItem; gw?: PaymentGateway }) {
  return (
    <div className="pa-fc-h">
      <h2>{item.name}</h2>
      <Stat k={gw?.connection_status ?? "not_configured"} />
      <Stat k={gw?.en_uso ? "uso" : "sinuso"} />
      <span className="pa-ult pa-num">{gw?.last_checked_at ? `Última prueba: ${fdate(gw.last_checked_at)}` : "Sin pruebas todavía"}</span>
    </div>
  )
}

export function FichaBody({ item, gw, c, source }: { item: GatewayCatalogItem; gw?: PaymentGateway; c: PagFichaCtl; source: string | null }) {
  return (
    <div className="pa-fc-b">
      <div className="pa-g2"><EnvBlock c={c} /><OriginBlock source={source} kept={Boolean(gw && !gw.en_uso && Object.keys(gw.configured_fields ?? {}).length)} /></div>
      <div className="pa-g2">{c.fields.map(f => <KeyField key={f} field={f} c={c} gw={gw} />)}</div>
      <WebhookBlock url={gw?.webhook_url ?? (item.provider === "culqi" ? WEBHOOK : "")} />
      <div className="pa-acts2"><ProbarBlock gw={gw} c={c} /><UsarBlock gw={gw} c={c} /></div>
      <PagResult gw={gw} c={c} />
    </div>
  )
}

/** Texto del pie: avisa ANTES de guardar que guardar apaga el uso. */
export function SaveNote({ gw, c, id }: { gw?: PaymentGateway; c: PagFichaCtl; id: string }) {
  if (!c.dirty) return <p className="pa-tx pa-mut" id={id}>Sin cambios por guardar.</p>
  const msg = gw ? "Al guardar, Culqi dejará de usarse hasta que la pruebes y la actives de nuevo." : "Al guardar, Culqi quedará en «Guardado, falta probar»: tendrás que probarla y activarla."
  return <p className="pa-tx pa-why" style={{ margin: 0 }} id={id}>{msg}</p>
}

export function SaveButton({ c, id }: { c: PagFichaCtl; id: string }) {
  return <Btn dis={!c.dirty} by={id} busy={c.busy === "save"} onClick={() => void c.save()} od="guardar">{c.busy === "save" ? "Guardando…" : "Guardar"}</Btn>
}

/** Ficha en columna (escritorio). */
export function PagFicha({ item, gw, c, source }: { item: GatewayCatalogItem; gw?: PaymentGateway; c: PagFichaCtl; source: string | null }) {
  return (
    <section className="pa-card" aria-label={`Ficha de ${item.name}`}>
      <FichaHead item={item} gw={gw} />
      <FichaBody item={item} gw={gw} c={c} source={source} />
      <div className="pa-ft"><SaveNote gw={gw} c={c} id="pag-save-note" /><SaveButton c={c} id="pag-save-note" /></div>
    </section>
  )
}
