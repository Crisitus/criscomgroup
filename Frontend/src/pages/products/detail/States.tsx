import { Loader2, PackageX } from "lucide-react"
import { I } from "./shared"

const Sk = ({ rows }: { rows: string[] }) => (
  <div className="card"><div className="sk" style={{ height: 20, width: 140 }} />{rows.map((w, i) => <div key={i} className="sk" style={{ height: 44, width: w, marginTop: 14 }} />)}</div>
)

export function Loading() {
  return (
    <div className="pg" aria-busy="true">
      <div className="hd"><div className="t"><h1>Producto</h1><span className="pend neu" role="status">{I(Loader2, 16, "spin")}Cargando ficha del producto…</span></div></div>
      <div className="cols">
        <div className="col"><Sk rows={["100%", "100%"]} /><Sk rows={["100%", "60%"]} /><Sk rows={["100%"]} /></div>
        <div className="col"><Sk rows={["100%", "100%", "100%"]} /><Sk rows={["100%"]} /></div>
      </div>
    </div>
  )
}

export function NotFound({ onBack, text }: { onBack: () => void; text?: string }) {
  return (
    <div className="pg">
      <div className="hd"><div className="t"><h1>Producto</h1></div></div>
      <section className="card">
        <div className="nf" role="alert">
          <div className="ico">{I(PackageX, 28)}</div>
          <h2>No se encontró el producto solicitado</h2>
          <p className="mut">{text ?? "Revisa el enlace o vuelve al listado de productos."}</p>
          <button type="button" className="btn" onClick={onBack}>Volver a productos</button>
        </div>
      </section>
    </div>
  )
}
