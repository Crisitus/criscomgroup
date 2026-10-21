import { Check, CircleAlert, CircleX, Loader2, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react"
import { I } from "./tkIcon"
import { pl } from "./tkLogic"
import { MAX_TICKETS } from "./ticketConfig"
import type { TkPage } from "./useTkPage"

/** Banda pegada a la tabla: N de M seleccionados sin codigo de barras (su ticket lleva «SKU:»). */
export function AvSinCodigo({ p, box }: { p: TkPage; box?: boolean }) {
  if (!p.config.mostrarCodigoBarras || p.sinCodigo === 0 || p.n === 0) return null
  return (
    <div className={`av warn${box ? " box" : ""}`} role="status">{I(TriangleAlert, 18)}
      <div className="tx"><b className="num">{p.sinCodigo} de {p.n}</b> {pl(p.sinCodigo, "producto seleccionado no tiene", "productos seleccionados no tienen")} código de barras: su ticket llevará el SKU, marcado como «SKU:».</div>
    </div>
  )
}

/** Banda: productos del listado descartados por datos incompletos (no desaparecen en silencio). */
export function AvInvalidos({ invalidos }: { invalidos: number }) {
  if (invalidos === 0) return null
  return (
    <div className="av neu" role="status">{I(CircleAlert, 18)}
      <div className="tx"><b className="num">{invalidos}</b> {pl(invalidos, "producto", "productos")} del listado no {pl(invalidos, "tiene", "tienen")} nombre o SKU válidos y no {pl(invalidos, "aparece", "aparecen")} aquí.</div>
    </div>
  )
}

/** Mas de 600 etiquetas: aviso con la cifra exacta (los botones quedan deshabilitados con el motivo). */
export function AvExceso({ p }: { p: TkPage }) {
  if (!p.excede) return null
  return (
    <div className="av bad box" role="alert">{I(CircleAlert, 18)}
      <div className="tx"><b className="num">Son {p.etiquetas} etiquetas;</b> el máximo por PDF es {MAX_TICKETS}. Reduce la selección o las copias por producto.</div>
    </div>
  )
}

/** Estado de la generacion/descarga: persistente hasta la siguiente accion (ya no son toasts). */
export function AvGeneracion({ p }: { p: TkPage }) {
  const r = p.resultado
  if (p.gen === "gen") {
    return (
      <div className="av neu box" role="status">{I(Loader2, 18, "spin")}
        <div className="tx"><b className="num">Generando PDF…</b> {p.etiquetas} {pl(p.etiquetas, "etiqueta", "etiquetas")} · {p.hojas} {pl(p.hojas, "hoja", "hojas")}. Los botones se reactivan al terminar.</div>
      </div>
    )
  }
  if (p.gen === "generr") {
    return (
      <div className="av bad box" role="alert">{I(CircleX, 18)}
        <div className="tx"><b>Error al generar.</b> No se pudo generar el PDF. Vuelve a intentarlo; si persiste, reduce la cantidad de productos.</div>
        <button type="button" className="btn out sm" onClick={() => void p.ejecutar("descarga")}>{I(RefreshCw, 16)}Volver a intentar</button>
      </div>
    )
  }
  if (!r) return null
  if (r.tipo === "ok") {
    return (
      <div className="av ok box" role="status">{I(Check, 18)}
        <div className="tx"><b className="num">PDF descargado: {r.etiquetas} etiquetas en {r.hojas} {pl(r.hojas, "hoja", "hojas")}</b><br />
          <span className="mono">{r.nombre}</span> · <span className="st ok">{I(ShieldCheck, 14)}Registrada en auditoría</span></div>
      </div>
    )
  }
  return (
    <div className="av warn box" role="alert">{I(TriangleAlert, 18)}
      <div className="tx"><b className="num">PDF descargado: {r.etiquetas} etiquetas en {r.hojas} {pl(r.hojas, "hoja", "hojas")}</b> · <span className="mono">{r.nombre}</span><br />
        <b>Auditoría pendiente.</b> El PDF se descargó, pero no se pudo registrar en la auditoría. El archivo ya está guardado: no hace falta descargarlo otra vez.</div>
    </div>
  )
}
