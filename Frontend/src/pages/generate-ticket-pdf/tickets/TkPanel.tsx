import { Lock, ShieldCheck } from "lucide-react"
import { HojaA4 } from "./TkTicketHtml"
import { Stp, Swr } from "./tkCommon"
import { I } from "./tkIcon"
import { pl } from "./tkLogic"
import { MAX_COPIAS } from "./ticketConfig"
import type { TkPage } from "./useTkPage"

export const NOTA_AUDITORIA = "Cada descarga queda registrada en auditoría (cantidad y filtros). La vista previa no se registra."
export const NOTA_COSTOS = "Los tickets solo llevan precios de venta con IGV; los costos nunca se muestran ni se imprimen."

/** Las unicas opciones que cambian el papel: interruptores, fuente y copias (un valor global). */
export function TkOpciones({ p }: { p: TkPage }) {
  const c = p.config
  return (
    <>
      <Swr on={c.mostrarCodigoBarras} label="Código de barras (Code 128)" onToggle={() => p.cambiarConfig({ mostrarCodigoBarras: !c.mostrarCodigoBarras })} />
      <Swr on={c.mostrarQr} label="QR a la ficha del producto" onToggle={() => p.cambiarConfig({ mostrarQr: !c.mostrarQr })} />
      <Swr on={c.mostrarPrecioMayorista} label="Precio por docena" onToggle={() => p.cambiarConfig({ mostrarPrecioMayorista: !c.mostrarPrecioMayorista })} />
      <Swr on={c.mostrarPrecioOferta} label="Precio de oferta (con «Antes» tachado)" onToggle={() => p.cambiarConfig({ mostrarPrecioOferta: !c.mostrarPrecioOferta })} />
      <div className="stps">
        <Stp id="tk-fs" label="Tamaño de fuente" valor={c.tamanoFuente} min={8} max={20} onCambio={v => p.cambiarConfig({ tamanoFuente: v })} />
        <Stp id="tk-cop" label="Etiquetas por producto" valor={c.copias} min={1} max={MAX_COPIAS} onCambio={v => p.cambiarConfig({ copias: v })} />
      </div>
      <div className="pnote">{I(ShieldCheck, 14)}<span>{NOTA_AUDITORIA}</span></div>
      <div className="pnote">{I(Lock, 14)}<span>{NOTA_COSTOS}</span></div>
    </>
  )
}

/** Panel «Etiquetas» (columna derecha en escritorio): opciones + hoja A4 en miniatura. */
export function TkPanel({ p, compacto }: { p: TkPage; compacto: boolean }) {
  const ancho = compacto ? 204 : 272
  const cap = p.n === 0
    ? <><b>Hoja — de —</b><span className="num">0 etiquetas</span></>
    : <><b className="num">Hoja 1 de {p.hojas}</b><span className="num">{Math.min(21, p.etiquetas)} {pl(Math.min(21, p.etiquetas), "etiqueta", "etiquetas")}</span></>
  return (
    <aside className="pnl" aria-label="Etiquetas">
      <h2>Etiquetas</h2>
      <TkOpciones p={p} />
      <div className="pcap">{cap}</div>
      <div className="shwc"><HojaA4 items={p.items} config={p.config} pagina={0} ancho={ancho} /></div>
    </aside>
  )
}
