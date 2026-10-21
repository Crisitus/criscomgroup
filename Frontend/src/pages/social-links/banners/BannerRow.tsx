import { CircleCheck, EyeOff, GripVertical, Image, Pencil, Trash2, Video, ChevronDown, ChevronUp } from "lucide-react"
import type { KeyboardEvent, PointerEvent } from "react"
import { ARROW, I, Q } from "../shared"
import { BannerThumb } from "./BannerThumb"
import { bannerOn, bannerTitle, type Row } from "./bannerShared"

export interface RowProps {
  b: Row; index: number; total: number; position: number
  dragging: boolean; busy: boolean; locked: boolean
  onToggle: () => void; onEdit: () => void; onDelete: () => void; onPreview: () => void
  onMove: (dir: -1 | 1) => void
  onHandleDown: (e: PointerEvent<HTMLButtonElement>) => void
  onHandleMove: (e: PointerEvent<HTMLButtonElement>) => void
  onHandleUp: (e: PointerEvent<HTMLButtonElement>) => void
  onHandleCancel: () => void
}

export function BannerRow(p: RowProps) {
  const { b } = p
  const on = bannerOn(b), t = bannerTitle(b)
  const first = p.index === 0, last = p.index === p.total - 1
  const video = b.media_type === "video"
  const orden = b.orden ?? 0
  const key = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowUp") { e.preventDefault(); p.onMove(-1) }
    else if (e.key === "ArrowDown") { e.preventDefault(); p.onMove(1) }
    else if (e.key === "Escape") p.onHandleCancel()
  }
  return (
    <div className={`br${p.dragging ? " drag" : ""}`} role="group" aria-label={t} aria-busy={p.busy || undefined} data-banner={b.id_banner}>
      <button type="button" className="gr" aria-label={`Arrastrar para reordenar: ${t}`} disabled={p.locked}
        onPointerDown={p.onHandleDown} onPointerMove={p.onHandleMove} onPointerUp={p.onHandleUp} onPointerCancel={p.onHandleCancel} onKeyDown={key}>
        {I(GripVertical, 20)}
      </button>
      <div className="mv">
        <button type="button" className="btn out sq up" aria-disabled={first || p.locked} onClick={() => { if (!first && !p.locked) p.onMove(-1) }}
          aria-label={first ? "Subir: ya es el primero" : `Subir ${Q(t)}`}>{I(ChevronUp, 18)}</button>
        <button type="button" className="btn out sq dn" aria-disabled={last || p.locked} onClick={() => { if (!last && !p.locked) p.onMove(1) }}
          aria-label={last ? "Bajar: ya es el último" : `Bajar ${Q(t)}`}>{I(ChevronDown, 18)}</button>
      </div>
      <BannerThumb b={b} onOpen={p.onPreview} />
      <div className="inf">
        <span className="ti">{t}</span>
        <div className="mt">
          <span>{video ? I(Video, 16) : I(Image, 16)}{video ? "Video" : "Imagen"}</span>
          <span>{p.dragging && p.position !== orden ? <>Orden {orden} {ARROW} <b>{p.position}</b></> : <>Orden {orden}</>}</span>
          {p.dragging && <span className="tag">{I(GripVertical, 14)}Moviendo</span>}
        </div>
      </div>
      <button type="button" className="sw" role="switch" aria-checked={on} disabled={p.busy || p.locked} onClick={p.onToggle}
        aria-label={`${on ? "Publicado" : "Oculto"}: ${t}. Un clic para ${on ? "ocultarlo" : "publicarlo"}`}>
        <span className="tr" />
        {on ? <span className="st ok">{I(CircleCheck, 16)}Publicado</span> : <span className="st neu">{I(EyeOff, 16)}Oculto</span>}
      </button>
      <div className="ac">
        <button type="button" className="btn out ed" onClick={p.onEdit} aria-label={`Editar ${Q(t)}`}>{I(Pencil, 16)}<span className="tx">Editar</span></button>
        <button type="button" className="btn out del" onClick={p.onDelete} aria-label={`Eliminar ${Q(t)}`}>{I(Trash2, 16)}<span className="tx">Eliminar</span></button>
      </div>
    </div>
  )
}
