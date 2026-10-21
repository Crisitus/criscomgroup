import { Plus } from "lucide-react"
import { useState } from "react"
import { I } from "../shared"
import { PageHead, PageTabs, type Tab } from "../PageHead"
import { BannersBody } from "./BannersBody"
import { BannersOverlays, type Panel } from "./BannersOverlays"
import type { Row } from "./bannerShared"
import type { BannersApi } from "./useBanners"

export function BannersTab({ api, tab, onTab, published }: { api: BannersApi; tab: Tab; onTab: (t: Tab) => void; published: number | null }) {
  const [panel, setPanel] = useState<Panel>(null)
  const [del, setDel] = useState<Row | null>(null)
  const [view, setView] = useState<Row | null>(null)
  const openNew = () => setPanel({ banner: null })
  const canNew = !api.loading && !api.error
  return (
    <>
      <PageHead action={canNew ? <button type="button" className="btn" onClick={openNew}>{I(Plus, 18)}Subir banner</button> : undefined} />
      <PageTabs tab={tab} onTab={onTab} published={published} />
      <div className="zone fs" role="tabpanel" id="panel-sl" aria-labelledby="tab-banners">
        <div className="body"><BannersBody api={api} onNew={openNew} onEdit={b => setPanel({ banner: b })} onDelete={setDel} onPreview={setView} /></div>
      </div>
      <BannersOverlays api={api} panel={panel} setPanel={setPanel} del={del} setDel={setDel} view={view} setView={setView} />
    </>
  )
}
