import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { commercialApi } from "../../../services/commercialService"
import { ErpDrawer } from "../../../components/erp/ErpDialog"
import { useDocumentTitle } from "../../../hooks/useDocumentTitle"
import { PurchaseList } from "./PurchaseList"
import { PurchaseDetail } from "./PurchaseDetail"
import { VoidDialog } from "./VoidDialog"
import { ReceiveForm } from "./ReceiveForm"
import { SuppliersTab } from "./SuppliersTab"
import { SupplierPanel } from "./SupplierPanel"
import { I, type Purchase, type StockProduct, type Supplier } from "./purchasesShared"
import "../../../styles/compras.css"

type Status = "load" | "ok" | "error"
type Tab = "compras" | "proveedores"

export default function PurchasesPage() {
  useDocumentTitle("Compras y proveedores")
  const [tab, setTab] = useState<Tab>("compras")
  const [receiving, setReceiving] = useState(false)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<StockProduct[]>([])
  const [pSt, setPSt] = useState<Status>("load")
  const [sSt, setSSt] = useState<Status>("load")
  const [selId, setSelId] = useState<number | null>(null)
  const [voiding, setVoiding] = useState(false)
  const [panel, setPanel] = useState<{ s: Supplier | null } | null>(null)
  const [width, setWidth] = useState(1200)
  const host = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const ro = new ResizeObserver(([r]) => setWidth(Math.round(r.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const mob = width < 640

  const load = useCallback(async () => {
    const [s, p, d] = await Promise.allSettled([commercialApi.suppliers(), commercialApi.purchases(), commercialApi.dashboard()])
    if (s.status === "fulfilled") { setSuppliers(s.value); setSSt("ok") } else setSSt("error")
    if (p.status === "fulfilled") { setPurchases(p.value); setPSt("ok") } else setPSt("error")
    if (d.status === "fulfilled") setProducts(d.value.products || [])
    else toast.error("No se pudo cargar el inventario de productos")
  }, [])
  useEffect(() => { void load() }, [load])
  const retry = () => { setPSt("load"); setSSt("load"); void load() }

  const sel = purchases.find(c => c.id_compra === selId) || null
  const tabBtn = (k: Tab, label: string, n: number) => (
    <button type="button" className="tab" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}<span className="n">{n}</span></button>
  )
  const btnCls = mob ? "btn sm" : "btn"

  if (receiving) return (
    <div className={`pg-compras${mob ? " fx" : ""}`} ref={host}>
      <ReceiveForm suppliers={suppliers} products={products} mob={mob} onCancel={() => setReceiving(false)}
        onDone={p => { setReceiving(false); setTab("compras"); void load().then(() => setSelId(p.id_compra)) }} />
    </div>
  )
  return (
    <div className="pg-compras" ref={host}>
      <div className="pg">
        <div className="hd"><h1>Compras y proveedores</h1>
          {tab === "compras"
            ? <button type="button" className={btnCls} onClick={() => setReceiving(true)}>{I(Plus, 18)}Recibir compra</button>
            : <button type="button" className={btnCls} onClick={() => setPanel({ s: null })}>{I(Plus, 18)}Nuevo proveedor</button>}
        </div>
        <div className="tabs" role="tablist" aria-label="Compras y proveedores">{tabBtn("compras", "Compras", purchases.length)}{tabBtn("proveedores", "Proveedores", suppliers.length)}</div>
        {tab === "compras"
          ? <PurchaseList purchases={purchases} suppliers={suppliers} status={pSt} mob={mob} hl={selId} onOpen={setSelId} onRetry={retry} />
          : <SuppliersTab suppliers={suppliers} status={sSt} mob={mob} onEdit={s => setPanel({ s })} onChanged={() => void load()} onRetry={retry} />}
      </div>
      <ErpDrawer open={!!sel} onOpenChange={o => { if (!o && !voiding) setSelId(null) }} label="Detalle de la compra">
        {sel && <div className="pg-compras dlgw drw"><PurchaseDetail p={sel} onClose={() => setSelId(null)} onVoid={() => setVoiding(true)} /></div>}
      </ErpDrawer>
      {sel && voiding && <VoidDialog p={sel} products={products} onClose={() => setVoiding(false)} onDone={() => { setVoiding(false); void load() }} />}
      <ErpDrawer open={!!panel} onOpenChange={o => { if (!o) setPanel(null) }} label={panel?.s ? "Editar proveedor" : "Nuevo proveedor"}>
        {panel && <div className="pg-compras dlgw drw"><SupplierPanel supplier={panel.s} onClose={() => setPanel(null)} onSaved={() => { setPanel(null); void load() }} /></div>}
      </ErpDrawer>
    </div>
  )
}
