import { Play } from "lucide-react"
import { I } from "../shared"
import { bannerTitle, type Row } from "./bannerShared"

/** Miniatura 16:9 real (imagen o primer cuadro del video). Con onOpen es un botón de 54 px de alto. */
export function BannerThumb({ b, width, onOpen }: { b: Row; width?: number; onOpen?: () => void }) {
  const video = b.media_type === "video"
  const inner = (
    <>
      {video
        ? <video src={`${b.imagen_url}#t=0.1`} muted playsInline preload="metadata" tabIndex={-1} aria-hidden="true" />
        : <img src={b.imagen_url || ""} alt="" loading="lazy" />}
      {video && <i className="pl">{I(Play, 14)}</i>}
    </>
  )
  const style = width ? { width } : undefined
  if (!onOpen) return <span className="th" style={style} aria-hidden="true">{inner}</span>
  return <button type="button" className="th bt" style={style} onClick={onOpen} aria-label={`Ver en grande: ${bannerTitle(b)}`}>{inner}</button>
}
