import { ChevronLeft, Zap } from "lucide-react"
import { ErpDrawer } from "../../../components/erp/ErpDialog"
import type { GatewayCatalogItem, PaymentGateway } from "../../../services/paymentGatewayService"
import type { PagFichaCtl } from "./usePagFicha"
import { Btn, I } from "./pagCommon"
import { FichaBody, FichaHead, SaveButton, SaveNote } from "./PagFicha"
import { probarWhy } from "./pagWhy"

/** Móvil: la ficha a pantalla completa con pie fijo (guardar / probar). */
export function PagSheet({ item, gw, c, source, onClose }: { item: GatewayCatalogItem; gw?: PaymentGateway; c: PagFichaCtl; source: string | null; onClose: () => void }) {
  const why = probarWhy(gw, c)
  return (
    <ErpDrawer open onOpenChange={o => { if (!o && !c.prodOpen) onClose() }} label={`Ficha de ${item.name}`}>
      <div className="pg-pagos dlgw drw">
        <span className="erp-sr" id="pag-sheet-why">{why}</span>
        <div className="pa-dhd"><button type="button" className="pa-lnk" onClick={onClose}>{I(ChevronLeft)}Pasarelas web</button></div>
        <div className="pa-scr">
          <section className="pa-card" aria-label={`Ficha de ${item.name}`}>
            <FichaHead item={item} gw={gw} />
            <FichaBody item={item} gw={gw} c={c} source={source} />
          </section>
        </div>
        <div className="pa-fix" data-od="pie-fijo">
          <SaveNote gw={gw} c={c} id="pag-sheet-note" />
          <div className="pa-r">
            <Btn out dis={Boolean(why)} by="pag-sheet-why" busy={c.busy === "test"} onClick={() => void c.test()} icon={I(Zap)}>Probar conexión</Btn>
            <SaveButton c={c} id="pag-sheet-note" />
          </div>
        </div>
      </div>
    </ErpDrawer>
  )
}
