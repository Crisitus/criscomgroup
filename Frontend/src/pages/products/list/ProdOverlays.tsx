import { ErpDrawer } from "../../../components/erp/ErpDialog"
import { AdjustDialog } from "./AdjustDialog"
import { CodesDialog } from "./CodesDialog"
import { DeleteDialog } from "./DeleteDialog"
import { HistoryPanel } from "./HistoryPanel"
import { ImageDialog } from "./ImageDialog"
import { LocationsPanel } from "./LocationsPanel"
import { NewProductDialog } from "./NewProductDialog"
import { useProdData } from "./useProdData"
import type { Row } from "./prodShared"

export type Ov =
  | { k: "nuevo" } | { k: "adj"; r: Row } | { k: "del"; r: Row } | { k: "codes"; r: Row }
  | { k: "hist"; r: Row } | { k: "ubic"; pid?: number } | { k: "img"; url: string; name: string }

export function ProdOverlays({ ov, setOv, ro, refresh, rows, onCreated }: {
  ov: Ov | null; setOv: (o: Ov | null) => void; ro: boolean; refresh: () => void; rows: Row[]; onCreated: (id: number) => void
}) {
  const { cats } = useProdData()
  if (!ov) return null
  const close = () => setOv(null)
  const fresh = (r: Row) => rows.find(x => x.id === r.id) || r
  switch (ov.k) {
    case "nuevo": return <NewProductDialog cats={cats} onClose={close} onCreated={id => { refresh(); close(); onCreated(id) }} />
    case "adj": return <AdjustDialog r={fresh(ov.r)} ro={ro} onClose={close} onDone={() => { refresh(); close() }} />
    case "del": return <DeleteDialog r={fresh(ov.r)} onClose={close} onDone={() => { refresh(); close() }} onAdjust={() => setOv({ k: "adj", r: ov.r })} />
    case "codes": return <CodesDialog r={fresh(ov.r)} onClose={close} />
    case "img": return <ImageDialog url={ov.url} name={ov.name} onClose={close} />
    case "hist": return (
      <ErpDrawer open onOpenChange={o => { if (!o) close() }} label="Historial de movimientos">
        <HistoryPanel r={fresh(ov.r)} ro={ro} onClose={close} onAdjust={() => setOv({ k: "adj", r: ov.r })} />
      </ErpDrawer>
    )
    case "ubic": return (
      <ErpDrawer open onOpenChange={o => { if (!o) close() }} label="Ubicaciones">
        <LocationsPanel rows={rows} pid={ov.pid} ro={ro} onClose={close} onChanged={refresh} />
      </ErpDrawer>
    )
  }
}
