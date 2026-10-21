import { useState } from "react"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { PageHead, PageTabs, type Tab } from "./PageHead"
import { BannersTab } from "./banners/BannersTab"
import { useBanners } from "./banners/useBanners"
import { bannerOn } from "./banners/bannerShared"
import { NetworksBody } from "./networks/NetworksBody"
import { SaveBar } from "./networks/SaveBar"
import { useNetworks } from "./networks/useNetworks"
import "../../styles/redes-banners.css"

export default function SocialLinksPage() {
  useDocumentTitle("Redes y banners")
  const [tab, setTab] = useState<Tab>("redes")
  const nw = useNetworks()
  const api = useBanners()
  const published = api.loading || api.error ? null : api.banners.filter(bannerOn).length

  return (
    <div className="pg-redes fx">
      {tab === "redes" ? (
        <>
          <PageHead />
          <PageTabs tab={tab} onTab={setTab} published={published} />
          <div className="zone" role="tabpanel" id="panel-sl" aria-labelledby="tab-redes"><div className="body"><NetworksBody nw={nw} /></div></div>
          <SaveBar nw={nw} />
        </>
      ) : <BannersTab api={api} tab={tab} onTab={setTab} published={published} />}
    </div>
  )
}
