import { CircleAlert, FilterX, Lock, Package, RefreshCw, Search } from "lucide-react"
import { I } from "./tkIcon"

const GENERICO = "No se pudieron cargar los productos."

const Emp = ({ tono, icono, rol, titulo, texto, children }: {
  tono: "neu" | "bad" | "acc"; icono: React.ReactNode; rol: "status" | "alert"; titulo: string; texto: React.ReactNode; children?: React.ReactNode
}) => (
  <div className="emp" role={rol}>
    <span className={`ico ${tono}`}>{icono}</span><h3>{titulo}</h3><p>{texto}</p>{children}
  </div>
)

/** 500 / red: con «Reintentar». El texto del servidor va como detalle. */
export const TkError = ({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) => (
  <Emp tono="bad" rol="alert" icono={I(CircleAlert, 22)} titulo={GENERICO}
    texto={mensaje === GENERICO ? "No hubo respuesta del servidor. Revisa tu conexión e inténtalo de nuevo." : `Respuesta del servidor: ${mensaje}`}>
    <button type="button" className="btn" onClick={onReintentar}>{I(RefreshCw, 16)}Reintentar</button>
  </Emp>
)

/** 403: sin «Reintentar» (no lo arregla); recuerda roles y que los costos nunca se muestran. */
export const TkSinPermiso = () => (
  <Emp tono="bad" rol="alert" icono={I(Lock, 22)} titulo={GENERICO} texto="No tienes permiso para ver los productos.">
    <p style={{ marginTop: 8, fontSize: 13 }}>Los roles Vendedor y Auditoría no tienen esta pantalla. Los costos nunca se muestran ni se imprimen.</p>
  </Emp>
)

export const TkVacio = () => (
  <Emp tono="neu" rol="status" icono={I(Package, 22)} titulo="Todavía no hay productos"
    texto="Cuando registres productos en el inventario podrás imprimir sus tickets desde aquí." />
)

export const TkSinResultados = ({ onLimpiar }: { onLimpiar: () => void }) => (
  <Emp tono="acc" rol="status" icono={I(Search, 22)} titulo="No se encontraron productos"
    texto="Ajusta los filtros para encontrar los productos que necesitas.">
    <button type="button" className="btn rp" onClick={onLimpiar}>{I(FilterX, 16)}Limpiar filtros</button>
  </Emp>
)

const Bloque = ({ w, h = 12 }: { w: string; h?: number }) => <span className="skb" style={{ width: w, height: h }} />

/** Esqueleto de 10 filas dentro de la tarjeta de la tabla (cabecera y filtros ya visibles). */
export const TkEsqueleto = () => (
  <div className="tcard" role="status" aria-busy="true">
    <span className="sr">Cargando productos…</span>
    <table className="tb"><tbody>
      {Array.from({ length: 10 }, (_, i) => (
        <tr key={i} className="sk-row">
          <td style={{ width: 44, padding: 0 }}><span className="cb"><span className="skb" style={{ width: 20, height: 20, borderRadius: 5 }} /></span></td>
          <td><Bloque w={`${70 + (i * 37) % 25}%`} /></td>
          <td><Bloque w="80%" /></td>
          <td><Bloque w="70%" /></td>
          <td><Bloque w="60%" /></td>
          <td><Bloque w="50%" /></td>
          <td><Bloque w="60%" /></td>
          <td><Bloque w="85%" /></td>
        </tr>
      ))}
    </tbody></table>
  </div>
)
