import { useQuery } from "@tanstack/react-query"
import { Barcode, Copy, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import { longDate } from "../../../components/erp/format"
import { obtenerCodigosBarras } from "../../../services/codigoBarrasService"
import { I, SEP, errMsg, pl, type Row } from "./prodShared"

interface Code { id: number; codigo: string; cantidad: number; fecha_ingreso: string }

export function CodesDialog({ r, onClose }: { r: Row; onClose: () => void }) {
  const q = useQuery({ queryKey: ["product-barcodes", r.id], queryFn: () => obtenerCodigosBarras(r.id), gcTime: 0 })
  const codes = ((q.data as { codigos_barras?: Code[] } | undefined)?.codigos_barras || [])
  const copy = (c: string) => {
    navigator.clipboard?.writeText(c).then(() => toast.success("Código copiado al portapapeles"), () => toast.error("No se pudo copiar el código"))
  }
  return (
    <ErpDialog open onOpenChange={o => { if (!o) onClose() }} title="Códigos de barras" description={`${r.p.nombre}${SEP}${r.p.sku}`} icon={I(Barcode, 22)}>
      <div className="pg-prod dlgw"><div className="dlg">
        {q.isLoading && <p role="status">Cargando códigos...</p>}
        {q.isError && <div className="err-box" role="alert">{I(RefreshCw, 18)}<span>{errMsg(q.error, "No se pudieron cargar los códigos de barras")}</span></div>}
        {q.isSuccess && !codes.length && <p>Este producto no tiene códigos de barras asociados. No se podrá encontrar escaneando hasta que se le añada uno.</p>}
        {codes.length > 0 && (
          <div className="lst" role="list" style={{ marginTop: 12 }}>
            {codes.map(c => (
              <div className="lr" role="listitem" key={c.id}>
                <div className="t"><b className="num">{c.codigo}</b><span>Agregado el {longDate(c.fecha_ingreso.slice(0, 10))}{SEP}{pl(c.cantidad, "unidad", "unidades")}</span></div>
                <button type="button" className="btn out sm" aria-label={`Copiar código ${c.codigo}`} onClick={() => copy(c.codigo)}>{I(Copy)}Copiar</button>
              </div>
            ))}
          </div>
        )}
        <div className="acts">
          {q.isError && <button type="button" className="btn out" onClick={() => void q.refetch()}>Reintentar</button>}
          <button type="button" className="btn out" onClick={onClose}>Cerrar</button>
        </div>
      </div></div>
    </ErpDialog>
  )
}
