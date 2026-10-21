import { useState } from "react"
import { Search, TriangleAlert } from "lucide-react"
import { consultarRuc } from "../../../services/invoiceService"
import type { Company } from "../../../services/companyService"
import { rucCheck, rucDv } from "./empFormat"
import { rucNeedsDemo, type EmpDraft, type EmpErrors } from "./empForm"
import { EmpCard, EmpCheck, EmpField, EmpNote, EmpWhy, ic } from "./empParts"

interface Cmp { razon: string; dir: string }
interface Props { d: EmpDraft; base: Company | null; errs: EmpErrors; set: <K extends keyof EmpDraft>(k: K, v: EmpDraft[K]) => void }

/** Identidad fiscal: razon social, RUC con modulo 11, tipo derivado, direccion y consulta a SUNAT con comparativo. */
export function EmpIdent({ d, base, errs, set }: Props) {
  const [cmp, setCmp] = useState<Cmp | null>(null)
  const [busy, setBusy] = useState(false)
  const [lookErr, setLookErr] = useState("")
  const rc = rucCheck(d.ruc)
  const needsDemo = rucNeedsDemo(d, base)
  const demoSaved = !!base && d.ruc === base.ruc && rc === "dv"
  const canLook = (rc === "ok" || rc === "dv") && (!needsDemo || d.rucDemo) && !busy
  const tipo = /^(10|20)/.test(d.ruc) ? d.ruc.slice(0, 2) : "—"

  const look = async () => {
    if (!canLook) return
    setBusy(true); setLookErr(""); setCmp(null)
    try {
      const r = await consultarRuc(d.ruc)
      setCmp({ razon: r.razonSocial || "", dir: r.direccion || "" })
    } catch { setLookErr("No se pudo consultar el RUC en este momento. No se cambió nada; inténtalo de nuevo.") }
    finally { setBusy(false) }
  }
  const apply = () => {
    if (cmp?.razon) set("razon_social", cmp.razon)
    if (cmp?.dir) set("direccion", cmp.dir)
    setCmp(null)
  }
  const why = rc === "ok" || rc === "dv" ? "" : "Escribe un RUC de 11 dígitos para consultar."

  return (
    <EmpCard sec="ident" title="Identidad fiscal" help="Con estos datos se emite cada comprobante.">
      <div className="gd">
        <EmpField cls="g6" label="Razón social" required value={d.razon_social} max={100} error={errs.razon_social} onChange={v => set("razon_social", v)} placeholder={base ? "" : "Razón social de la empresa emisora"} />
        <EmpField
          cls="g4" label="RUC" required value={d.ruc} inputMode="numeric" error={errs.ruc} onChange={v => set("ruc", v.replace(/\D/g, "").slice(0, 11))}
          placeholder={base ? "" : "11 dígitos, empieza por 10 o 20"}
          extra={needsDemo ? <EmpCheck on={d.rucDemo} onToggle={() => set("rucDemo", !d.rucDemo)} title="RUC de demostración" sub="Degrada el error a aviso y permite guardar." /> : undefined}
        />
        <EmpField cls="g2" label="Tipo de RUC" value={tipo} readOnly />
        <EmpField cls="g12" label="Dirección" required value={d.direccion} max={255} error={errs.direccion} onChange={v => set("direccion", v)} placeholder={base ? "" : "Dirección fiscal"} />
        {cmp && (
          <div className="inl g12" role="status">
            <h3>SUNAT devolvió estos datos para el RUC {d.ruc}</h3>
            <div className="cmp">
              <b>Campo</b><b>Actual</b><b>SUNAT</b>
              <span>Razón social</span><span>{d.razon_social || "—"}</span><span><strong>{cmp.razon || "Sin dato"}</strong></span>
              <span>Dirección</span><span>{d.direccion || "—"}</span><span><strong>{cmp.dir || "Sin dato"}</strong></span>
            </div>
            <div className="hint">Al aplicar se rellenan Razón social y Dirección en el formulario; no se guarda hasta pulsar Guardar cambios.</div>
            <div className="acts">
              <button type="button" className="btn out" onClick={() => setCmp(null)}>Descartar</button>
              <button type="button" className="btn" onClick={apply} disabled={!cmp.razon && !cmp.dir}>Aplicar datos de SUNAT</button>
            </div>
          </div>
        )}
        <div className="ft">
          {demoSaved
            ? <EmpNote kind="warn" icon={TriangleAlert}><strong>RUC de demostración</strong>El dígito verificador esperado es {rucDv(d.ruc)} y el RUC termina en {d.ruc[10]}: se guarda con aviso.</EmpNote>
            : <span className="hint" id="emp-look-why">{why}</span>}
          <button type="button" className="btn out" aria-disabled={!canLook} aria-describedby={why ? "emp-look-why" : undefined} onClick={() => void look()}>
            {ic(Search, 16)}{busy ? "Consultando…" : "Consultar y completar desde SUNAT"}
          </button>
        </div>
        {lookErr && <div className="g12"><EmpWhy alert>{lookErr}</EmpWhy></div>}
      </div>
    </EmpCard>
  )
}
