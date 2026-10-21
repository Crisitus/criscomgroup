import { CircleCheck, EyeOff } from "lucide-react"
import { I } from "../shared"

export function SafePreview({ src, video, safe, onSafe, onDims }: { src: string; video: boolean; safe: boolean; onSafe: (v: boolean) => void; onDims: (w: number, h: number) => void }) {
  return (
    <>
      <div className="pvw" role="img" aria-label="Vista previa 16:9 con la zona segura del hero">
        {video
          ? <video src={src} muted loop playsInline preload="metadata" onLoadedMetadata={e => onDims(e.currentTarget.videoWidth, e.currentTarget.videoHeight)} />
          : <img src={src} alt="" onLoad={e => onDims(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)} />}
        {safe && <div className="sz" aria-hidden="true"><div className="tx"><span>Texto del hero</span></div><div className="sb2"><span>Sujeto</span></div></div>}
      </div>
      <div className="row2 one">
        <button type="button" className="sw" role="switch" aria-checked={safe} onClick={() => onSafe(!safe)}>
          <span className="tr" />{safe ? <span className="st ok">{I(CircleCheck, 16)}Zona segura visible</span> : <span className="st neu">{I(EyeOff, 16)}Zona segura oculta</span>}
        </button>
        <p className="mut">El carrusel recorta con <b>object-cover</b>: solo la mitad derecha se ve con seguridad. Texto del hero a la izquierda, sujeto a la derecha, nada importante cerca de los bordes.</p>
      </div>
    </>
  )
}
