import { CircleCheck, EyeOff, GripVertical } from "lucide-react"
import { useRef, useState, type PointerEvent } from "react"
import { ARROW, I, Q, pl } from "../shared"
import { BannerRow } from "./BannerRow"
import { bannerOn, bannerTitle, type Row } from "./bannerShared"
import type { BannersApi } from "./useBanners"

interface Drag { id: number; from: number; to: number; y0: number; h: number }

export function BannerList({ api, onEdit, onDelete, onPreview }: { api: BannersApi; onEdit: (b: Row) => void; onDelete: (b: Row) => void; onPreview: (b: Row) => void }) {
  const { banners, reordering } = api
  const [drag, setDrag] = useState<Drag | null>(null)
  const ref = useRef<Drag | null>(null)
  const set = (d: Drag | null) => { ref.current = d; setDrag(d) }

  const ids = banners.map(b => b.id_banner)
  const withMove = (id: number, to: number) => { const rest = ids.filter(x => x !== id); rest.splice(to - 1, 0, id); return rest }
  const shown = drag ? withMove(drag.id, drag.to).map(id => banners.find(b => b.id_banner === id)!) : banners
  const move = (id: number, dir: -1 | 1) => {
    const i = ids.indexOf(id), j = i + dir
    if (j < 0 || j >= ids.length || reordering) return
    const next = [...ids]; [next[i], next[j]] = [next[j], next[i]]
    void api.reorder(next)
  }

  const down = (b: Row) => (e: PointerEvent<HTMLButtonElement>) => {
    if (reordering || e.button > 0) return
    const row = (e.currentTarget.closest(".br") as HTMLElement)
    e.currentTarget.setPointerCapture(e.pointerId)
    const from = ids.indexOf(b.id_banner) + 1
    set({ id: b.id_banner, from, to: from, y0: e.clientY, h: row.offsetHeight || 76 })
  }
  const moveEv = (e: PointerEvent<HTMLButtonElement>) => {
    const d = ref.current
    if (!d) return
    const to = Math.min(ids.length, Math.max(1, d.from + Math.round((e.clientY - d.y0) / d.h)))
    if (to !== d.to) set({ ...d, to })
  }
  const up = (e: PointerEvent<HTMLButtonElement>) => {
    const d = ref.current
    if (!d) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    set(null)
    if (d.to !== d.from) void api.reorder(withMove(d.id, d.to))
  }

  const pub = banners.filter(bannerOn).length
  const dragged = drag ? banners.find(b => b.id_banner === drag.id) : null
  return (
    <section className="card" aria-label="Banners">
      <div className="lc-h" role="status">
        <span className="st ok">{I(CircleCheck, 16)}{pl(pub, "publicado", "publicados")}</span>
        <span className="sep" aria-hidden="true">·</span>
        <span className="st neu">{I(EyeOff, 16)}{pl(banners.length - pub, "oculto", "ocultos")}</span>
      </div>
      {shown.map((b, i) => (
        <BannerRow key={b.id_banner} b={b} index={i} total={shown.length} position={i + 1}
          dragging={drag?.id === b.id_banner} busy={api.busy.includes(b.id_banner)} locked={reordering || (!!drag && drag.id !== b.id_banner)}
          onToggle={() => void api.toggle(b)} onEdit={() => onEdit(b)} onDelete={() => onDelete(b)} onPreview={() => onPreview(b)}
          onMove={dir => move(b.id_banner, dir)} onHandleDown={down(b)} onHandleMove={moveEv} onHandleUp={up} onHandleCancel={() => set(null)} />
      ))}
      {drag && dragged && <div className="live" role="status">{I(GripVertical, 16)}<span>Moviendo {Q(bannerTitle(dragged))}: posición {drag.from} {ARROW} {drag.to}. Al soltar se guarda el nuevo orden de una vez.</span></div>}
    </section>
  )
}
