import { useEffect, useRef, useState } from "react"
import { CircleCheck, ImageIcon, RefreshCw, Upload } from "lucide-react"
import type { Company } from "../../../services/companyService"
import { fmtKb, LIM_LOGO, logoSrc, SEP } from "./empFormat"
import { EmpCard, EmpWhy, ic } from "./empParts"

interface Props { base: Company | null; file: File | null; error?: string; onPick: (f: File | null) => void }

export function EmpLogo({ base, file, error, onPick }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  const saved = logoSrc(base?.logo_url)
  const savedName = base?.logo_url ? base.logo_url.split(/[\\/]/).pop() : null
  const open = () => input.current?.click()
  const kind = file ? "prev" : saved ? "ok" : "none"

  return (
    <EmpCard sec="logo" title="Logo" help="Imagen de la empresa en los comprobantes.">
      <div className="row">
        <div className={`box${kind === "none" ? " dash" : ""}`}>
          {kind === "none" ? ic(ImageIcon, 24) : <img src={preview ?? saved ?? ""} alt={kind === "prev" ? "Vista previa del logo nuevo" : "Logo cargado"} className="logo-img" />}
        </div>
        <div className="meta">
          {kind === "none" && <><b>Sin logo</b><span>{LIM_LOGO}</span></>}
          {kind === "ok" && <><b>{savedName}</b><span><span className="st ok">{ic(CircleCheck, 14)}Cargado</span></span><span>{LIM_LOGO}</span></>}
          {kind === "prev" && file && <>
            <b>{file.name}</b>
            <span>{fmtKb(file.size)}{SEP}<span className="st warn">{ic(RefreshCw, 14)}Se reemplazará al guardar</span></span>
            {savedName && <span>Actual: {savedName}</span>}
          </>}
        </div>
        <div className="acs">
          {kind === "prev" && <button type="button" className="btn out" onClick={() => onPick(null)}>Cancelar reemplazo</button>}
          <button type="button" className="btn out" onClick={open}>{ic(Upload, 16)}{kind === "none" ? "Subir logo" : kind === "ok" ? "Reemplazar logo" : "Elegir otro"}</button>
        </div>
        <input ref={input} type="file" className="fi" tabIndex={-1} aria-label="Archivo de logo" accept="image/jpeg,image/png,image/webp" onChange={e => { onPick(e.target.files?.[0] ?? null); e.target.value = "" }} />
      </div>
      {error && <EmpWhy alert>{error}</EmpWhy>}
    </EmpCard>
  )
}
