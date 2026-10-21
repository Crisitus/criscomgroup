import { Download, FileSpreadsheet, Lock, Table2, TriangleAlert } from "lucide-react"
import { sinCodigoBarras } from "../productData"
import { Ck } from "./ExpControls"
import { I } from "./expCommon"
import { MOTIVO_COSTOS, pl, textoCelda } from "./expFormat"
import { CLAVES_EXTRA } from "./expLogic"
import type { ExpPage } from "./useExpPage"

const FIJAS = ["Producto", "Código de Barras", "Cantidad", "Cantidad (Par)"]

export function ExpFileName({ p }: { p: ExpPage }) {
  return (
    <>
      <div className="fn">{I(Download, 14)}<span>{p.nombre}</span></div>
      <div className="mut" style={{ fontSize: 12, marginTop: 4 }}>Hoja «Productos» · encabezado en negrita</div>
    </>
  )
}

/** Columnas del archivo: 4 fijas bloqueadas con su razon y 4 opcionales (los costos dependen del permiso). */
export function ExpColumns({ p }: { p: ExpPage }) {
  return (
    <div className="sec">
      <div className="sl">Columnas<span className="mut" style={{ fontWeight: 400 }}>4 fijas · hasta 5 opcionales</span></div>
      <div className="fx">{FIJAS.map(c => <span key={c} className="tag">{I(Lock, 12)}{c}</span>)}</div>
      <div className="mut" style={{ fontSize: 12, lineHeight: 1.35 }}>Fijas: siempre van, con el nombre, orden y ancho de hoy.</div>
      <div className="og">
        <Ck st={p.cols.sku} label="SKU" onToggle={() => p.cambiarColumna("sku", !p.cols.sku)} />
        <Ck st={p.cols.categoria} label="Categoría" onToggle={() => p.cambiarColumna("categoria", !p.cols.categoria)} />
        <Ck st={p.cols.precio} label="Precio con IGV (S/)" onToggle={() => p.cambiarColumna("precio", !p.cols.precio)} />
        <Ck st={p.puedeCostos && p.cols.costos} label="Incluir costos" disabled={!p.puedeCostos} describedBy="exp-mot-costos" onToggle={() => p.cambiarColumna("costos", !p.cols.costos)} />
      </div>
      {!p.puedeCostos && <div className="hint neu" id="exp-mot-costos">{I(Lock, 16)}<span>{MOTIVO_COSTOS}</span></div>}
      {p.costos && <div className="hint warn" role="status">{I(TriangleAlert, 16)}<span>El archivo llevará Costo promedio y Último costo. Quien abra el Excel los verá.</span></div>}
    </div>
  )
}

const SinFilas = () => (
  <div className="empty-pv">{I(Table2, 18)}<span>Sin filas que mostrar: no hay productos seleccionados en el filtro. El archivo saldría solo con el encabezado.</span></div>
)

/** Vista previa tabular: encabezado + hasta 5 filas tal como saldran (extras en una linea bajo cada fila). */
export function ExpPreview({ p }: { p: ExpPage }) {
  const { filas } = p.vista
  if (!filas.length) return <SinFilas />
  const extras = (i: number) => CLAVES_EXTRA.filter(k => k in filas[i])
  const haySku = p.aExportar.slice(0, 5).some(sinCodigoBarras)
  return (
    <>
      <table className="pv">
        <colgroup><col /><col style={{ width: 112 }} /><col style={{ width: 60 }} /><col style={{ width: 66 }} /></colgroup>
        <thead><tr><th>Producto</th><th>Código de Barras</th><th className="r">Cantidad</th><th className="r">Cantidad (Par)</th></tr></thead>
        <tbody>
          {filas.map((f, i) => {
            const e = extras(i)
            return [
              <tr key={`f${i}`}>
                <td title={f.Producto}>{f.Producto}</td>
                <td title={String(f["Código de Barras"])}>{sinCodigoBarras(p.aExportar[i]) ? <span className="skv">{f["Código de Barras"]}</span> : f["Código de Barras"]}</td>
                <td className="r num">{f.Cantidad}</td><td className="r num">{f["Cantidad (Par)"]}</td>
              </tr>,
              e.length > 0 && (
                <tr key={`x${i}`} className="xr"><td colSpan={4}>
                  {e.map((k, j) => <span key={k}>{j > 0 && " · "}<span className="mut">{k}</span> <b>{textoCelda(f[k])}</b></span>)}
                </td></tr>
              ),
            ]
          })}
        </tbody>
      </table>
      {haySku && <div className="pvn"><span className="skv">SKU</span> Con borde punteado: SKU en lugar del código de barras.</div>}
    </>
  )
}

export const ExpPreviewTitle = ({ p }: { p: ExpPage }) => {
  const n = p.aExportar.length
  return <div className="sl">Vista previa<span className="mut num" style={{ fontWeight: 400 }}>{Math.min(5, n)} de {n} {pl(n, "fila", "filas")}</span></div>
}

/** Panel «Archivo» de escritorio (columna derecha). */
export function ExpArchive({ p }: { p: ExpPage }) {
  return (
    <aside className="arch tcard" aria-label="Archivo">
      <div className="sec"><h2>{I(FileSpreadsheet, 18)}Archivo</h2><ExpFileName p={p} /></div>
      <ExpColumns p={p} />
      <div className="sec"><ExpPreviewTitle p={p} /><ExpPreview p={p} /></div>
    </aside>
  )
}
