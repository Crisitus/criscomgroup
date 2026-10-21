import { useRef } from "react"
import { CircleCheck, KeyRound, RefreshCw, Upload } from "lucide-react"
import type { Company } from "../../../services/companyService"
import { fmtDate, fmtKb, LIM_CERT, SEP } from "./empFormat"
import { EmpCard, EmpCfgChip, EmpWhy, ic } from "./empParts"

interface Props { base: Company | null; file: File | null; vence: string | null; error?: string; alta: boolean; onPick: (f: File | null) => void }

/** Certificado digital: nunca se muestra; solo estado, vigencia (tras guardar) y reemplazo. */
export function EmpCert({ base, file, vence, error, alta, onPick }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const have = !!base?.certificado_configurado
  const open = () => input.current?.click()
  const kind = file ? "chosen" : have ? (vence ? "saved" : "have") : "none"

  return (
    <EmpCard sec="cert" title="Certificado digital" help="Firma los comprobantes ante SUNAT.">
      <div className="row">
        <div className={`box${kind === "none" ? " dash" : ""}`}>{ic(KeyRound, 24)}</div>
        <div className="meta">
          {kind === "none" && <><b>Sin certificado{alta ? " · obligatorio al registrar" : ""}</b><span>{LIM_CERT}</span></>}
          {kind === "chosen" && file && <>
            <b>{file.name}</b>
            <span>{fmtKb(file.size)}{SEP}<span className="st warn">{ic(RefreshCw, 14)}Se reemplazará al guardar</span></span>
            <span>{LIM_CERT}</span>
          </>}
          {kind === "saved" && <><b>Certificado configurado</b><span className="st ok">{ic(CircleCheck, 14)}Vence el {fmtDate(vence)}</span><span>{LIM_CERT}</span></>}
          {kind === "have" && <><b>Certificado configurado</b><span>La vigencia se muestra al guardar un certificado nuevo.</span><span>{LIM_CERT}</span></>}
        </div>
        <div className="acs">
          {kind === "chosen" && <button type="button" className="btn out" onClick={() => onPick(null)}>Quitar selección</button>}
          <button type="button" className="btn out" onClick={open}>{ic(Upload, 16)}{kind === "none" ? "Seleccionar archivo" : kind === "chosen" ? "Elegir otro" : "Reemplazar archivo"}</button>
        </div>
        <input ref={input} type="file" className="fi" tabIndex={-1} aria-label="Archivo del certificado" accept=".pem,.txt,.crt,.cer,.cert" onChange={e => { onPick(e.target.files?.[0] ?? null); e.target.value = "" }} />
      </div>
      {kind !== "chosen" && <div style={{ marginTop: 8 }}><EmpCfgChip on={have} /></div>}
      {error && <div style={{ marginTop: 8 }}><EmpWhy alert>{error}</EmpWhy></div>}
    </EmpCard>
  )
}
