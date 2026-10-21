import { CircleAlert, CircleCheck, RefreshCw, TriangleAlert } from "lucide-react"
import { I } from "./simParts"
import type { Errs } from "./simForm"
import type { Banner } from "./useSimDetail"

/** Resumen de errores por campo + avisos del servidor (guardado, 409, fallo). */
export function SimBanners({ k, errs, banner, pend, onReload, onDiscard, onKeep }: {
  k: string; errs: Errs; banner: Banner | null; pend: { cod: string; que: string } | null
  onReload: () => void; onDiscard: () => void; onKeep: () => void
}) {
  const lista = Object.entries(errs) as [string, string][]
  return (
    <div className="bnr">
      {pend && (
        <div className="bn wn" role="alertdialog" aria-label="Cambios sin guardar">
          {I(TriangleAlert, 18)}
          <div><b>Tienes cambios sin guardar en esta solicitud</b>Si abres {pend.cod} se perderán: {pend.que}.
            <div className="acts"><button type="button" className="btn out" onClick={onDiscard}>Descartar y abrir {pend.cod.slice(-10)}</button><button type="button" className="btn pri" onClick={onKeep}>Seguir editando</button></div>
          </div>
        </div>
      )}
      {lista.length > 0 && (
        <div className="bn er" role="alert">
          {I(CircleAlert, 18)}
          <div><b>{lista.length === 1 ? "Falta corregir 1 campo" : `Faltan corregir ${lista.length} campos`}</b>Revisa los campos marcados:
            <ul>{lista.map(([f, m]) => <li key={f}><a href={`#${k}-${f}`} onClick={e => { e.preventDefault(); document.getElementById(`${k}-${f}`)?.focus() }}>{m}</a></li>)}</ul>
          </div>
        </div>
      )}
      {banner?.k === "c409" && (
        <div className="bn er" role="alert">
          {I(CircleAlert, 18)}
          <div><b>La solicitud cambió mientras la editabas</b>{banner.t}
            <div className="t1" style={{ marginTop: 4 }}>Lo que escribiste se conserva. Al recargar verás el estado real del servidor.</div>
            <div className="acts"><button type="button" className="btn out" onClick={onReload}>{I(RefreshCw, 16)}Recargar la solicitud</button></div>
          </div>
        </div>
      )}
      {banner?.k === "fallo" && <div className="bn er" role="alert">{I(CircleAlert, 18)}<div><b>No se pudo completar la acción</b>{banner.t}</div></div>}
      {banner?.k === "ok" && <div className="bn ok" role="status">{I(CircleCheck, 18)}<div><b>{banner.h ?? "Cambios guardados"}</b>{banner.t}</div></div>}
    </div>
  )
}
