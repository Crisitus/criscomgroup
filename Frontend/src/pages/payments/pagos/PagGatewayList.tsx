import { ChevronRight } from "lucide-react"
import type { GatewayCatalogItem, PaymentGateway } from "../../../services/paymentGatewayService"
import { I, Stat } from "./pagCommon"
import { ST } from "./pagData"

export function PagGatewayList({ items, prep, gw, selected, onOpen }: {
  items: GatewayCatalogItem[]; prep: GatewayCatalogItem[]; gw: (p: string) => PaymentGateway | undefined; selected: boolean; onOpen: () => void
}) {
  return (
    <section className="pa-card pa-clip" aria-labelledby="pag-h-pas">
      <div className="pa-ch"><h2 id="pag-h-pas">Pasarelas web</h2><span className="pa-nt">{items.length} integrada{items.length === 1 ? "" : "s"}{prep.length ? ` · ${prep.length} en preparación` : ""}</span></div>
      {items.map(it => {
        const g = gw(it.provider)
        const k = g?.connection_status ?? "not_configured"
        return (
          <button key={it.provider} type="button" className="pa-gwr" aria-current={selected || undefined} onClick={onOpen}
            aria-label={`${it.name}, ${ST[k]?.[2] ?? k}${g?.en_uso ? ", en uso" : ""}. Abrir ficha`}>
            <span><span className="pa-n">{it.name}</span><Stat k={k} /></span>
            {g?.en_uso ? <Stat k="uso" text="En uso" /> : <span />}
            {I(ChevronRight, 16, "ch2")}
          </button>
        )
      })}
      {prep.length > 0 && <>
        <div className="pa-pre-h"><b>En preparación</b>Sin flujo de cobro todavía: no cobran y no se pueden configurar ni activar.</div>
        {prep.map(it => <div className="pa-pre-r" key={it.provider}><span>{it.name}</span><Stat k="prep" /></div>)}
      </>}
    </section>
  )
}
