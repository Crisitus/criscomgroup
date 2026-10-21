import { useState, type ReactNode } from "react"
import { Eye, EyeOff, Lock } from "lucide-react"
import type { Reclamacion } from "../../services/libroReclamacionesService"
import { cap, clean, docEtiqueta, maskDoc, maskDom, money } from "./libroCommon"
import { I } from "./libroParts"

const Fld = ({ k, full, cls, children }: { k: string; full?: boolean; cls?: string; children: ReactNode }) => (
  <div className={`fld${full ? " full" : ""}`}><span className="k">{k}</span><span className={`v${cls ? ` ${cls}` : ""}`}>{children}</span></div>
)

/** Hoja de reclamacion en solo lectura; documento y domicilio enmascarados hasta pulsar «Mostrar datos». */
export function DetailFicha({ r }: { r: Reclamacion }) {
  const [rev, setRev] = useState(false)
  const menor = !!r.es_menor
  return (
    <>
      <section className="sec" aria-label="Hoja de reclamación">
        <h3>Hoja de reclamación</h3>
        <div className="fl">
          <Fld k="Consumidor">{r.nombre}</Fld>
          <Fld k="Correo">{r.email}</Fld>
          <Fld k="Teléfono">{r.telefono || "No indicó teléfono"}</Fld>
          <Fld k={cap(r.tipo_bien ?? "producto")}>{r.bien || "No indicó"}</Fld>
          <Fld k="Monto" cls="mk">{money(r.monto)}</Fld>
          <Fld k="Detalle" full>{clean(r.descripcion)}</Fld>
          <Fld k="Pedido del consumidor" full>{r.pedido || "No indicó pedido"}</Fld>
        </div>
      </section>
      <section className="sec" aria-label="Datos personales">
        <div className="pdh">
          <h4>Datos personales</h4>
          <button type="button" className="btn txt" aria-pressed={rev} onClick={() => setRev(v => !v)}>{I(rev ? EyeOff : Eye, 16)}{rev ? "Ocultar datos" : "Mostrar datos"}</button>
        </div>
        <div className="fl">
          <Fld k={r.documento ? docEtiqueta(r.documento) : "Documento"} cls={menor ? "lk" : rev ? "" : "mk"}>
            {menor ? <>{I(Lock, 14)}<span>No se muestra en hojas de menores</span></>
              : r.documento ? (rev ? r.documento : maskDoc(r.documento)) : "No indicó documento"}
          </Fld>
          <Fld k="Domicilio" cls={rev ? "" : "mk"}>{r.domicilio ? (rev ? r.domicilio : maskDom(r.domicilio)) : "No indicó domicilio"}</Fld>
        </div>
      </section>
    </>
  )
}
