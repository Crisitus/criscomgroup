import { CircleAlert, Upload } from "lucide-react"
import { useRef, useState, type DragEvent } from "react"
import { I } from "../shared"
import { ACCEPT } from "./bannerShared"

const SPEC = (
  <dl className="spec">
    <dt>Proporción</dt><dd>16:9 (p. ej. 1920 × 1080)</dd>
    <dt>Peso objetivo</dt><dd>menos de 400 KB</dd>
    <dt>Imagen</dt><dd>JPG, PNG, WebP, AVIF · hasta 8 MB</dd>
    <dt>Video</dt><dd>MP4, WebM · hasta 30 MB</dd>
  </dl>
)

export function DropArea({ onFile, problem, fileName }: { onFile: (f: File) => void; problem: string | null; fileName?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const stop = (e: DragEvent) => { e.preventDefault(); e.stopPropagation() }
  const drop = (e: DragEvent) => { stop(e); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }
  return (
    <>
      <div className={`dz${problem ? " bad" : ""}${over ? " over" : ""}`}
        onDragEnter={e => { stop(e); setOver(true) }} onDragOver={e => { stop(e); setOver(true) }} onDragLeave={e => { stop(e); setOver(false) }} onDrop={drop}>
        <span className="big">{I(Upload, 20)}</span>
        <b>{over ? "Suelta el archivo aquí" : "Arrastra aquí una imagen o un video"}</b>
        <button type="button" className="btn out" onClick={() => input.current?.click()}>{problem ? "Elegir otro archivo" : "Elegir archivo"}</button>
        <input ref={input} id="banner-file" hidden type="file" accept={ACCEPT} tabIndex={-1} aria-label="Archivo del banner"
          onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onFile(f) }} />
        {SPEC}
      </div>
      {problem && <FileAlert problem={problem} fileName={fileName} />}
    </>
  )
}

export function FileAlert({ problem, fileName }: { problem: string; fileName?: string }) {
  return <div className="al bad" role="alert"><CircleAlert className="ic" size={18} strokeWidth={1.75} aria-hidden="true" /><div><b>{fileName ? `${fileName} no se pudo subir` : "No se pudo subir"}</b><p>{problem}</p></div></div>
}

export function PickFile({ onFile, label }: { onFile: (f: File) => void; label: string }) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <button type="button" className="btn out" onClick={() => input.current?.click()}>{label}</button>
      <input ref={input} hidden type="file" accept={ACCEPT} tabIndex={-1} aria-label="Reemplazar archivo del banner"
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onFile(f) }} />
    </>
  )
}
