import type { ReactNode } from "react"

export type Tab = "redes" | "banners"

export function PageHead({ action }: { action?: ReactNode }) {
  return <div className="hd"><h1>Redes y banners</h1>{action}</div>
}

export function PageTabs({ tab, onTab, published }: { tab: Tab; onTab: (t: Tab) => void; published: number | null }) {
  const btn = (k: Tab, label: string, badge?: ReactNode) => (
    <button type="button" className="tab" role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls="panel-sl" onClick={() => onTab(k)}>{label}{badge}</button>
  )
  return (
    <div className="tabs" role="tablist" aria-label="Secciones">
      {btn("redes", "Redes")}
      {btn("banners", "Banners", published === null ? null : <span className="badge" aria-label={`${published} publicados`}>{published}</span>)}
    </div>
  )
}
