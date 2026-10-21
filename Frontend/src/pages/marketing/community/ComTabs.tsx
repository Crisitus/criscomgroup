export type ComTab = "c" | "m"

export function ComTabs({ tab, set, nc, nm, right }: { tab: ComTab; set: (t: ComTab) => void; nc: number | null; nm: number | null; right?: React.ReactNode }) {
  const b = (k: ComTab, label: string, n: number | null) => (
    <button type="button" className="tab" role="tab" aria-selected={tab === k} onClick={() => set(k)}>{label}<span className="n">{n ?? "—"}</span></button>
  )
  return <div className="tabrow"><div className="tabs" role="tablist" aria-label="Comunidad">{b("c", "Campañas", nc)}{b("m", "Miembros", nm)}</div>{right}</div>
}
