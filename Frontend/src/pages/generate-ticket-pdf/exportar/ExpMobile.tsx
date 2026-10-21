import { useEffect, useRef } from "react"
import { CircleCheck, Download, Info, Loader2, X } from "lucide-react"
import { sinCodigoBarras } from "../productData"
import { ExpAvisos } from "./ExpSummary"
import { ExpColumns, ExpFileName, ExpPreviewTitle } from "./ExpArchive"
import { MotivoBoton } from "./ExpHeader"
import { I } from "./expCommon"
import { pl, textoCelda } from "./expFormat"
import { CLAVES_EXTRA } from "./expLogic"
import type { ExpPage } from "./useExpPage"

/** Barra fija inferior: seleccion, unidades y la descarga siempre a la vista. */
export function ExpBottomBar({ p, barRef }: { p: ExpPage; barRef: React.RefObject<HTMLDivElement | null> }) {
  const n = p.aExportar.length
  return (
    <div className="bbar" ref={barRef}>
      <div className="r1">
        <div className="sm1"><b className="num">{n} {pl(n, "seleccionado", "seleccionados")}</b><span className="num">{p.avisos.unidades} {pl(p.avisos.unidades, "unidad", "unidades")}</span></div>
        {p.busy
          ? <button type="button" className="btn" aria-disabled="true">{I(Loader2, 16, "spin")}Generando…</button>
          : <button type="button" className="btn" aria-disabled={p.motivo ? true : undefined} aria-describedby={p.motivo ? "exp-why" : undefined} onClick={() => { if (!p.motivo) void p.descargar() }}>{I(Download, 16)}Descargar Excel ({n})</button>}
      </div>
      {!p.busy && p.motivo && <MotivoBoton texto={p.motivo} cargando={p.fase === "loading"} />}
    </div>
  )
}

/** Contexto de seleccion y atajos (movil). */
export function ExpMobileSummary({ p }: { p: ExpPage }) {
  const n = p.aExportar.length
  const m = p.filtrados.length
  return (
    <>
      <div className="mctx num">{I(n ? CircleCheck : Info, 16)}
        <span><b>{n} {pl(n, "seleccionado", "seleccionados")}</b> · {m} {pl(m, "filtrado", "filtrados")} · {p.datos.productos.length} en total · {p.avisos.unidades} {pl(p.avisos.unidades, "unidad", "unidades")}
          {p.fuera > 0 && <><br />{p.fuera} fuera del filtro no se exportan.</>}</span>
      </div>
      <div className="mrow">
        <button type="button" className="btn out sm" aria-disabled={m ? undefined : true} onClick={() => { if (m) p.marcarTodos() }}>Seleccionar todos ({m})</button>
        <button type="button" className="btn out sm" aria-disabled={p.seleccion.size ? undefined : true} onClick={() => { if (p.seleccion.size) p.deseleccionar() }}>Deseleccionar todos</button>
      </div>
    </>
  )
}

function Recs({ p }: { p: ExpPage }) {
  const { filas } = p.vista
  const haySku = p.aExportar.slice(0, 5).some(sinCodigoBarras)
  return (
    <>
      <div className="recs">
        {filas.map((f, i) => (
          <div className="rec" key={i}>
            <div className="h">Fila {i + 2}</div>
            <div className="v">
              <span style={{ flexBasis: "100%" }}><span className="mut">Producto</span> <b>{f.Producto}</b></span>
              <span><span className="mut">Código de Barras</span> <b>{sinCodigoBarras(p.aExportar[i]) ? <span className="skv">{f["Código de Barras"]}</span> : f["Código de Barras"]}</b></span>
              <span><span className="mut">Cantidad</span> <b className="num">{f.Cantidad}</b></span>
              <span><span className="mut">Cantidad (Par)</span> <b className="num">{f["Cantidad (Par)"]}</b></span>
              {CLAVES_EXTRA.filter(k => k in f).map(k => <span key={k}><span className="mut">{k}</span> <b className="num">{textoCelda(f[k])}</b></span>)}
            </div>
          </div>
        ))}
      </div>
      {haySku && <div className="pvn"><span className="skv">SKU</span> Con borde punteado: SKU en lugar del código de barras.</div>}
    </>
  )
}

/** Hoja «Archivo»: nombre, columnas, avisos y vista previa en filas. Escape o el boton la cierran. */
export function ExpSheet({ p, onClose }: { p: ExpPage; onClose: () => void }) {
  const cerrar = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    cerrar.current?.focus()
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", tecla)
    return () => document.removeEventListener("keydown", tecla)
  }, [onClose])
  const n = p.aExportar.length
  const hayAvisos = n > 0 && (p.avisos.sinCodigo.length > 0 || p.avisos.lotes.length > 0)
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Archivo">
        <div className="sh">
          <h2 style={{ fontSize: 18, display: "flex", gap: 8, alignItems: "center" }}>Archivo</h2>
          <button type="button" className="ib" ref={cerrar} aria-label="Cerrar" onClick={onClose}>{I(X, 18)}</button>
        </div>
        <ExpFileName p={p} />
        <ExpColumns p={p} />
        {hayAvisos && <div className="tcard" style={{ overflow: "hidden", margin: "8px 0" }}><ExpAvisos p={p} /></div>}
        <div className="sec">
          <ExpPreviewTitle p={p} />
          {n ? <Recs p={p} /> : <div className="empty-pv">{I(Info, 18)}<span>Sin filas que mostrar: no hay productos seleccionados.</span></div>}
        </div>
      </div>
    </>
  )
}
