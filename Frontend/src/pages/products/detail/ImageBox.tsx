import { useRef } from "react"
import { ImageIcon, Trash2, Undo2 } from "lucide-react"
import { useId } from "react"
import { I } from "./shared"

export function ImageBox({ url, pendingRemove, hasSaved, onPick, onClear, onUndo, onView }: {
  url: string | null
  pendingRemove: boolean
  hasSaved: boolean
  onPick: (f: File | undefined) => void
  onClear: () => void
  onUndo: () => void
  onView: (url: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const why = useId()
  const canClear = !!url || (hasSaved && !pendingRemove)
  return (
    <div className="img">
      {url ? (
        <button type="button" className="th" id={why} aria-label="Ver imagen del producto" onClick={() => onView(url)}>
          <img src={url} alt="Imagen del producto" />
        </button>
      ) : (
        <div className="th" id={why}>
          {I(ImageIcon, 20)}
          <span>{pendingRemove ? "Se quitará al guardar" : "Sin imagen"}</span>
        </div>
      )}
      <div className="ir">
        <button type="button" className="btn out sm" onClick={() => input.current?.click()}>
          {url || pendingRemove ? "Cambiar imagen" : "Subir imagen"}
        </button>
        {pendingRemove ? (
          <button type="button" className="ib bo" aria-label="Deshacer quitar imagen" onClick={onUndo}>{I(Undo2, 18)}</button>
        ) : (
          <button
            type="button"
            className="ib bo"
            aria-label="Quitar imagen"
            aria-disabled={!canClear}
            aria-describedby={canClear ? undefined : why}
            onClick={() => { if (canClear) onClear() }}
          >
            {I(Trash2, 18)}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" tabIndex={-1} aria-hidden="true" onChange={e => { onPick(e.target.files?.[0]); e.target.value = "" }} />
    </div>
  )
}
