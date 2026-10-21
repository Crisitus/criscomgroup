import { ErpDrawer } from "../../../components/erp/ErpDialog"
import { BannerPanel } from "./BannerPanel"
import { DeleteDialog } from "./DeleteDialog"
import { PreviewDialog } from "./PreviewDialog"
import type { Row } from "./bannerShared"
import type { BannersApi } from "./useBanners"

export type Panel = { banner: Row | null } | null

export function BannersOverlays({ api, panel, setPanel, del, setDel, view, setView }: {
  api: BannersApi; panel: Panel; setPanel: (p: Panel) => void; del: Row | null; setDel: (b: Row | null) => void; view: Row | null; setView: (b: Row | null) => void
}) {
  const current = panel?.banner ? api.banners.find(b => b.id_banner === panel.banner!.id_banner) || panel.banner : null
  return (
    <>
      <ErpDrawer open={!!panel} onOpenChange={o => { if (!o) setPanel(null) }} label={panel?.banner ? "Editar banner" : "Subir banner"}>
        {panel && <div className="pg-redes dlgw drw"><BannerPanel key={panel.banner?.id_banner ?? "new"} banner={current} api={api} onClose={() => setPanel(null)} onDelete={setDel} /></div>}
      </ErpDrawer>
      {del && <DeleteDialog b={del} api={api} onClose={() => setDel(null)} onDone={() => { if (panel?.banner?.id_banner === del.id_banner) setPanel(null); setDel(null) }} />}
      {view && <PreviewDialog b={view} onClose={() => setView(null)} />}
    </>
  )
}
