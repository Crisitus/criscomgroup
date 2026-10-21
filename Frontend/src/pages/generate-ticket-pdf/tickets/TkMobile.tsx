import { Download, Loader2, Tag, X } from "lucide-react"
import { useState } from "react"
import { AvSinCodigo, AvExceso, AvGeneracion } from "./TkAvisos"
import { TkCards } from "./TkCards"
import { TkFiltersMovil } from "./TkFilters"
import { HojaA4 } from "./TkTicketHtml"
import { TkOpciones } from "./TkPanel"
import { TkPager } from "./TkTable"
import { TkContador, TkFueraFiltro } from "./TkSelBar"
import { TkSinResultados } from "./TkStates"
import { I } from "./tkIcon"
import { pl } from "./tkLogic"
import type { TkPage } from "./useTkPage"

/** Barra fija inferior (movil): «E etiquetas · H hojas» y Descargar PDF siempre a la vista. */
export function TkBottomBar({ p, barRef }: { p: TkPage; barRef: React.RefObject<HTMLDivElement | null> }) {
  const gen = p.gen === "gen"
  const dis = Boolean(p.motivo) || gen
  const texto = p.n === 0
    ? <><b>0 etiquetas</b><span>Selecciona al menos un producto</span></>
    : gen
      ? <><b className="num">Generando PDF…</b><span className="num">{p.etiquetas} etiquetas · {p.hojas} {pl(p.hojas, "hoja", "hojas")}</span></>
      : <><b className="num">{p.etiquetas} {pl(p.etiquetas, "etiqueta", "etiquetas")} · {p.hojas} {pl(p.hojas, "hoja", "hojas")}</b><span>Cada descarga queda auditada</span></>
  return (
    <div className="mbar" ref={barRef}>
      <div className="t">{texto}</div>
      <button type="button" className="btn" aria-disabled={dis || undefined} aria-describedby={p.motivo ? "tk-why-m" : undefined}
        onClick={() => { if (!dis) void p.ejecutar("descarga") }}>
        {gen ? I(Loader2, 16, "spin") : I(Download, 16)}{gen ? "Generando…" : "Descargar PDF"}
      </button>
      {p.motivo && !gen && <span className="sr" id="tk-why-m">{p.motivo}</span>}
    </div>
  )
}

/** Hoja A4 y opciones a pantalla completa (movil): replica real + selector de hoja. */
function TkHojaMovil({ p, onClose }: { p: TkPage; onClose: () => void }) {
  const [hoja, setHoja] = useState(0)
  const actual = Math.min(hoja, Math.max(0, p.hojas - 1))
  const enHoja = p.items.slice(actual * 21, (actual + 1) * 21).length
  return (
    <div className="scr" role="dialog" aria-modal="true" aria-label="Hoja A4 y opciones">
      <div className="hd">
        <h1 style={{ fontSize: 20 }}>Hoja A4 y opciones</h1>
        <button type="button" className="ib bd" aria-label="Cerrar y volver a la lista" onClick={onClose}>{I(X, 20)}</button>
      </div>
      <AvSinCodigo p={p} box />
      <div className="pcap" style={{ margin: "8px 0 6px" }}>
        <b className="num">Hoja {actual + 1} de {p.hojas} · {enHoja} {pl(enHoja, "etiqueta", "etiquetas")}</b>
        {p.hojas > 1 && (
          <span className="shselm" role="group" aria-label="Elegir hoja">
            {Array.from({ length: p.hojas }, (_, i) => (
              <button key={i} type="button" className="pg1" aria-current={i === actual ? "page" : undefined} onClick={() => setHoja(i)}>{i + 1}</button>
            ))}
          </span>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <HojaA4 items={p.items} config={p.config} pagina={actual} ancho={342} />
      </div>
      <div className="card" style={{ marginTop: 8 }}>
        <h3>Opciones del PDF</h3>
        <TkOpciones p={p} />
      </div>
    </div>
  )
}

interface MovilProps {
  p: TkPage
  filtros: boolean
  onFiltros: () => void
  hoja: boolean
  onHoja: (abierta: boolean) => void
  barRef: React.RefObject<HTMLDivElement | null>
  estado: React.ReactNode
}

/** Lista movil: buscador + Filtros, contador + Etiquetas, avisos y tarjetas. */
export function TkMovil({ p, filtros, onFiltros, hoja, onHoja, barRef, estado }: MovilProps) {
  return (
    <>
      <div className="zone">
        <div className="pg">
          {estado}
          {p.fase === "ok" && (
            <>
              <AvExceso p={p} /><AvGeneracion p={p} />
              <TkFiltersMovil p={p} abierto={filtros} onToggle={onFiltros} />
              <div className="mcnt">
                <TkContador p={p} corto />
                <button type="button" className="btn out sm" onClick={() => onHoja(true)}>{I(Tag, 16)}Etiquetas</button>
              </div>
              <div className="fbar" style={{ gap: 0 }}>
                <button type="button" className="lnk" aria-disabled={p.filtrados.length ? undefined : true} onClick={() => { if (p.filtrados.length) p.marcarTodos() }}>Todos ({p.filtrados.length})</button>
                <button type="button" className="lnk" aria-disabled={p.n ? undefined : true} onClick={() => { if (p.n) p.deseleccionar() }}>Deseleccionar todos</button>
              </div>
              <TkFueraFiltro p={p} />
              <AvSinCodigo p={p} box />
              {p.filtrados.length ? <><TkCards p={p} /><TkPager p={p} /></> : <TkSinResultados onLimpiar={p.limpiarFiltros} />}
            </>
          )}
        </div>
      </div>
      {hoja && p.fase === "ok" && <TkHojaMovil p={p} onClose={() => onHoja(false)} />}
      <TkBottomBar p={p} barRef={barRef} />
    </>
  )
}
