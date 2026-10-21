import { CircleMinus, CircleX, Eye, MessageCircle } from "lucide-react"
import type { SocialLinks } from "../../../services/socialLinksService"
import { I } from "../shared"
import { NET, checkNet, phone } from "./netCheck"

export function NetPreview({ links }: { links: SocialLinks }) {
  const rows = NET.map(n => ({ n, c: checkNet(n, links[n.k]) }))
  const vis = rows.filter(x => x.c.s === "ok")
  const wa = vis.find(x => x.n.k === "whatsapp_number")
  const notes = rows.filter(x => x.c.s !== "ok")
  return (
    <aside className="card pv" aria-label="Vista previa del pie de la web">
      <h2>Así se verá en la web</h2>
      <div className="ftr" aria-label="Pie de página público">
        {vis.length ? vis.map(x => <span className="ico" key={x.n.k}><i>{I(x.n.icon, 20)}</i>{x.n.n}</span>) : <span className="mut">Ninguna red visible.</span>}
      </div>
      {wa && <div className="wa">{I(MessageCircle, 18)}<span>Botón de contacto: <b>{phone(wa.c.v || "")}</b></span></div>}
      <div className="st neu">{I(Eye, 16)}{vis.length} de {NET.length} redes visibles</div>
      {notes.length > 0 && <ul>{notes.map(x => (
        <li key={x.n.k} className={`st ${x.c.s === "bad" ? "bad" : "neu"}`}>
          {I(x.c.s === "bad" ? CircleX : CircleMinus, 16)}
          <span>{x.n.n}: {x.c.s === "bad" ? "enlace inválido, no saldrá hasta corregirlo." : "vacía, su icono no aparece."}</span>
        </li>))}</ul>}
    </aside>
  )
}
