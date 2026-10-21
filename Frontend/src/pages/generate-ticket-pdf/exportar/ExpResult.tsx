import { Check, CircleAlert, CircleCheck, TriangleAlert } from "lucide-react"
import { I } from "./expCommon"
import { fechaDMA, horaAmPm, pl } from "./expFormat"
import type { Resultado } from "./expLogic"

/** Constancia persistente de la ultima descarga: queda hasta la siguiente accion. */
export function ExpResult({ r }: { r: Resultado }) {
  if (r.tipo === "gen") {
    return (
      <section className="tcard res bad" role="alert">
        <span className="ico">{I(CircleAlert, 20)}</span>
        <div>
          <div className="tt">Error al generar el archivo Excel</div>
          <div className="sb">No se descargó ningún archivo. Puedes volver a pulsar «Descargar Excel ({r.cantidad})».</div>
        </div>
      </section>
    )
  }
  const ok = r.tipo === "ok"
  return (
    <section className={`tcard res ${ok ? "ok" : "warn"}`} role="status">
      <span className="ico">{I(ok ? CircleCheck : TriangleAlert, 20)}</span>
      <div>
        <div className="tt">{ok ? "Excel descargado:" : "El archivo se descargó, pero no se pudo registrar en la auditoría."} <code>{r.nombre}</code> ({r.cantidad} {pl(r.cantidad, "producto", "productos")})</div>
        <div className="ln">
          {ok
            ? <span className="st ok">{I(Check, 14)}Registrado en auditoría</span>
            : <span className="st warn">{I(TriangleAlert, 14)}Auditoría sin registrar</span>}
          {r.sinCodigo > 0 && <span className="st warn">{I(TriangleAlert, 14)}{r.sinCodigo} sin código de barras: se escribió su SKU</span>}
          <span className="st neu">{fechaDMA(r.cuando)} · {horaAmPm(r.cuando)}</span>
        </div>
      </div>
    </section>
  )
}
