import { CircleAlert, Lock, Package, RefreshCw, Search, FilterX } from "lucide-react"
import { I } from "./expCommon"

const Estado = ({ tono, icono, titulo, texto, rol, children }: { tono: "neu" | "bad" | "warn"; icono: React.ReactNode; titulo: string; texto: string; rol: "status" | "alert"; children?: React.ReactNode }) => (
  <section className={`tcard stt ${tono}`} role={rol}>
    <span className="ib0">{icono}</span><h2>{titulo}</h2><p>{texto}</p>{children}
  </section>
)

const GENERICO = "No se pudieron cargar los productos."

export const ExpVacio = () => (
  <Estado tono="neu" rol="status" icono={I(Package, 22)} titulo="Todavía no hay productos" texto="Cuando registres productos en el inventario podrás exportarlos desde aquí." />
)

/** Error de carga: conserva h1 y botón, es distinto del vacío. El texto del servidor va como linea secundaria. */
export const ExpError = ({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) => (
  <Estado tono="bad" rol="alert" icono={I(CircleAlert, 22)} titulo="No se pudieron cargar los productos." texto={mensaje === GENERICO ? "No hubo respuesta del servidor. Revisa tu conexión e inténtalo de nuevo." : `Respuesta del servidor: ${mensaje}`}>
    <button type="button" className="btn" onClick={onReintentar}>{I(RefreshCw, 16)}Reintentar</button>
  </Estado>
)

/** 403: reintentar no lo soluciona, asi que no se ofrece. */
export const ExpSinPermiso = () => (
  <Estado tono="warn" rol="alert" icono={I(Lock, 22)} titulo="No tienes permiso para ver los productos." texto="Reintentar no lo soluciona. Pide acceso a Gerencia." />
)

export const ExpSinResultados = ({ total, conStock, onLimpiar }: { total: number; conStock: boolean; onLimpiar: () => void }) => (
  <div className="stt neu" role="status">
    <span className="ib0">{I(Search, 22)}</span>
    <h2>Ningún producto cumple los filtros</h2>
    <p>Hay {total} productos en el sistema, pero los filtros los ocultan.{conStock ? " Prueba quitando «Con stock» o limpia los filtros." : " Limpia los filtros para volver a verlos."}</p>
    <button type="button" className="btn" onClick={onLimpiar}>{I(FilterX, 16)}Limpiar filtros</button>
  </div>
)

const Bloque = ({ w, h = 44 }: { w: string; h?: number }) => <span className="sk0" style={{ width: w, height: h, borderRadius: 8 }} />

/** Esqueleto de filtros, lista y panel mientras carga (antes: un spinner de 60 vh). */
export const ExpEsqueleto = ({ movil }: { movil: boolean }) => (
  <div role="status" aria-busy="true">
    <span className="sr">Cargando productos…</span>
    <div className="fbar" style={{ marginBottom: 12 }}>{movil ? <><Bloque w="60%" /><Bloque w="110px" /></> : <><Bloque w="26%" /><Bloque w="150px" /><Bloque w="170px" /><Bloque w="130px" /><Bloque w="120px" /><Bloque w="140px" /></>}</div>
    <div className={movil ? undefined : "cols"}>
      <section className="tcard lst">
        <div className="sbar"><Bloque w="200px" h={32} /></div>
        {Array.from({ length: movil ? 6 : 10 }, (_, i) => (
          <div className="skr" key={i}><span className="skbx" /><span className="sk0" style={{ width: "34%" }} /><span className="sk0" style={{ width: "12%" }} />{!movil && <span className="sk0" style={{ width: "22%" }} />}<span className="sk0" style={{ width: "6%", marginLeft: "auto" }} /></div>
        ))}
      </section>
      {!movil && (
        <aside className="arch tcard">
          <div className="sec"><Bloque w="50%" h={20} /><div style={{ height: 8 }} /><Bloque w="100%" h={40} /></div>
          <div className="sec"><Bloque w="40%" h={16} /><div style={{ height: 8 }} /><Bloque w="100%" h={88} /></div>
          <div className="sec"><Bloque w="40%" h={16} /><div style={{ height: 8 }} /><Bloque w="100%" h={160} /></div>
        </aside>
      )}
    </div>
  </div>
)
