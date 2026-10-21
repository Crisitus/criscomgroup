import { useLayoutEffect, useRef, useState } from "react"
import { TriangleAlert } from "lucide-react"
import { I } from "./pagCommon"
import { PagAudit } from "./PagAudit"
import { PagBand } from "./PagBand"
import { PagFicha } from "./PagFicha"
import { PagGatewayList } from "./PagGatewayList"
import { PagHeader } from "./PagHeader"
import { PagPayments } from "./PagPayments"
import { PagPos } from "./PagPos"
import { PagProdDialog } from "./PagProdDialog"
import { PagSheet } from "./PagSheet"
import { ErrCard, Forbidden, SkCard, Unauth } from "./PagStates"
import { usePagAudit } from "./usePagAudit"
import { usePagFicha } from "./usePagFicha"
import { usePagGateway } from "./usePagGateway"
import { usePagPayments } from "./usePagPayments"
import { usePagPos } from "./usePagPos"

/** Contenido de la pestaña «Pagos y POS». Sin cabecera ni pestañas propias: el contenedor pone el único h1. */
export default function PagPage() {
  const host = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1200)
  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const ro = new ResizeObserver(([r]) => setWidth(Math.round(r.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const mob = width < 640

  const g = usePagGateway()
  const pos = usePagPos()
  const pay = usePagPayments()
  const aud = usePagAudit()
  const [sheet, setSheet] = useState(false)
  // Cada acción sobre la pasarela refresca estado, origen y auditoría.
  const reloadAll = async () => { await Promise.all([g.reloadAll(), aud.allowed ? aud.blk.reload() : Promise.resolve()]) }
  const f = usePagFicha(g.item, g.gw, reloadAll)

  const st = g.web.status
  const gate = st === "forbidden" ? <Forbidden message={g.web.message} /> : st === "unauth" ? <Unauth /> : null
  const open = () => { if (mob) setSheet(true) }
  const gwOf = (p: string) => g.web.data?.gateways.find(x => x.provider === p)

  let top
  if (st === "load") top = mob ? <SkCard title="Pasarelas web" rows={5} /> : <div className="pa-top"><SkCard title="Pasarelas web" rows={5} /><SkCard title="Ficha de Culqi" rows={6} /></div>
  else if (st === "error") top = <ErrCard title="Pasarelas web" what="las pasarelas web" code={g.web.code} message={g.web.message} onRetry={g.web.retry} />
  else {
    const list = <PagGatewayList items={g.integrated} prep={g.prep} gw={gwOf} selected={!mob} onOpen={open} />
    top = mob || !g.item ? list : <div className="pa-top">{list}<PagFicha item={g.item} gw={g.gw} c={f} source={g.source} /></div>
  }

  const posCtx = pos.blk.status === "ok" ? `POS: ${pos.main?.nombre ?? "sin adquirente principal"}` : ""
  const webCtx = st === "ok" ? (g.gw?.en_uso ? "Culqi cobra en la tienda web" : "Culqi: sin uso en la tienda web") : ""
  const ctx = [webCtx, posCtx].filter(Boolean).join(" · ")

  return (
    <div className="pg-pagos" ref={host}>
      <div className="pa-pg">
        <PagHeader ctx={ctx} />
        {gate ?? <>
          <PagBand g={g} />
          {g.advertencias.length > 0 && <section className="pa-card pa-adv-card" role="note">{g.advertencias.map(m => <p className="pa-adv" key={m}>{I(TriangleAlert)}{m}</p>)}</section>}
          {top}
          <div className="pa-row2"><PagPos c={pos} /><PagPayments c={pay} mob={mob} /></div>
          <PagAudit c={aud} mob={mob} />
        </>}
      </div>
      {mob && sheet && g.item && <PagSheet item={g.item} gw={g.gw} c={f} source={g.source} onClose={() => setSheet(false)} />}
      {f.prodOpen && <PagProdDialog busy={f.busy === "save"} message={f.prodMsg} onCancel={() => f.setProdOpen(false)} onConfirm={t => void f.save(t)} />}
    </div>
  )
}
