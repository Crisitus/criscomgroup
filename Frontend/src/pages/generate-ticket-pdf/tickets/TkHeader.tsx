import { Download, Eye, Info, Loader2 } from "lucide-react"
import { I } from "./tkIcon"
import { pl } from "./tkLogic"
import type { TkPage } from "./useTkPage"

/** Motivo escrito junto a los botones deshabilitados (o la cuenta mientras genera). */
export function MotivoAccion({ texto, id }: { texto: string; id: string }) {
  return <span className="why" id={id} role="status">{I(Info, 14)}<span>{texto}</span></span>
}

/** Cabecera de 44 px: h1 a la izquierda; Vista previa y Descargar PDF a la derecha. */
export function TkHeader({ p, movil, onVista }: { p: TkPage; movil: boolean; onVista: () => void }) {
  const gen = p.gen === "gen"
  const bloqueado = Boolean(p.motivo) || gen
  if (movil) {
    return (
      <header className="hd">
        <h1>Generador de Tickets PDF</h1>
        <button type="button" className="ib bd" aria-disabled={bloqueado || undefined}
          aria-label={p.motivo ? `Vista previa: ${p.motivo}` : "Vista previa de la hoja A4"}
          onClick={() => { if (!bloqueado) onVista() }}>
          {gen ? I(Loader2, 20, "spin") : I(Eye, 20)}
        </button>
      </header>
    )
  }
  return (
    <header className="hd">
      <h1>Generador de Tickets PDF</h1>
      <div className="acts">
        {gen
          ? <span className="why num" role="status">{p.etiquetas} {pl(p.etiquetas, "etiqueta", "etiquetas")} · {p.hojas} {pl(p.hojas, "hoja", "hojas")}</span>
          : p.motivo && <MotivoAccion texto={p.motivo} id="tk-why" />}
        <button type="button" className="btn out" aria-disabled={bloqueado || undefined} aria-describedby={p.motivo ? "tk-why" : undefined}
          onClick={() => { if (!bloqueado) onVista() }}>
          {gen ? I(Loader2, 16, "spin") : I(Eye, 16)}Vista previa
        </button>
        <button type="button" className="btn" aria-disabled={bloqueado || undefined} aria-describedby={p.motivo ? "tk-why" : undefined}
          onClick={() => { if (!bloqueado) void p.ejecutar("descarga") }}>
          {gen ? I(Loader2, 16, "spin") : I(Download, 16)}{gen ? "Generando PDF…" : "Descargar PDF"}
        </button>
      </div>
    </header>
  )
}
