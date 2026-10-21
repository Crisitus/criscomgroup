import { Download, Eye, ShieldCheck } from "lucide-react"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import { AvSinCodigo } from "./TkAvisos"
import { NOTA_AUDITORIA } from "./TkPanel"
import { I } from "./tkIcon"
import { pl } from "./tkLogic"
import type { TkPage } from "./useTkPage"

/** Vista previa: el MISMO PDF que se descarga, en el visor del navegador. No se audita. */
export function TkPreview({ p }: { p: TkPage }) {
  const v = p.vista
  return (
    <ErpDialog open={Boolean(v)} onOpenChange={o => { if (!o) p.cerrarVista() }}
      title="Vista previa de la hoja A4"
      description={`${p.etiquetas} ${pl(p.etiquetas, "etiqueta", "etiquetas")} · ${p.hojas} ${pl(p.hojas, "hoja", "hojas")} A4`}>
      <div className="pg-tickets dlgw wide">
        {v && (
          <div className="pvz">
            <iframe className="pdfv" src={v.url} title="PDF de tickets" />
            <div className="side">
              <div className="card">
                <h3>Hojas</h3>
                <div className="big num">{p.hojas} {pl(p.hojas, "hoja", "hojas")}</div>
                <div style={{ fontSize: 12.5, color: "hsl(var(--nav-fg-2))", marginTop: 2 }}>3 columnas × 7 filas = 21 por hoja · etiqueta de 6,24 × 4,16 cm · la última hoja puede ir incompleta</div>
              </div>
              <div className="card">
                <h3>Todo el PDF</h3>
                <div className="kv"><span>Productos</span><b className="num">{p.n}</b></div>
                <div className="kv"><span>Copias por producto</span><b className="num">{p.config.copias}</b></div>
                <div className="kv"><span>Etiquetas</span><b className="num">{p.etiquetas}</b></div>
                <div className="kv"><span>Hojas A4</span><b className="num">{p.hojas}</b></div>
              </div>
              <AvSinCodigo p={p} box />
              <div className="pnote">{I(Eye, 14)}<span>Esta vista es el mismo PDF que se descargará.</span></div>
            </div>
          </div>
        )}
        <div className="pvf">
          <div className="l">{I(ShieldCheck, 16)}<span>{NOTA_AUDITORIA}</span></div>
          <div className="ba">
            <button type="button" className="btn out" onClick={p.cerrarVista}>Cerrar</button>
            <button type="button" className="btn" onClick={() => void p.descargarDesdeVista()}>{I(Download, 16)}Descargar PDF</button>
          </div>
        </div>
      </div>
    </ErpDialog>
  )
}
