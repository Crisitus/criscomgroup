import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import type { AuditCatalogo } from "../../services/auditLogService"
import { accItems, chipsDe, modItems, type Filtros } from "./audCommon"
import { AudDateField } from "./AudDateField"
import { AudPresets, Select, type SetF } from "./AudFilters"
import { AudUserBox } from "./AudUserBox"
import { I } from "./audParts"

/** Movil: hoja inferior con todos los filtros; se aplican al instante y el boton muestra el total. */
export function AudSheet({ f, cat, total, set, onClear, onClose }: { f: Filtros; cat: AuditCatalogo | null; total: number; set: SetF; onClear: () => void; onClose: () => void }) {
  const nf = chipsDe(f, cat).filter(c => c.clave !== "q").length
  return (
    <Dialog.Root open onOpenChange={o => { if (!o) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="erp-scrim" />
        <Dialog.Content className="pg-auditoria dlgw shw" aria-describedby={undefined}>
          <div className="sheet">
            <div className="sh">
              <Dialog.Title asChild><h3>Filtros</h3></Dialog.Title>
              <button type="button" className="ib" aria-label="Cerrar filtros" onClick={onClose}>{I(X, 20)}</button>
            </div>
            <p className="sub"><b style={{ color: "hsl(var(--foreground))" }}>{nf} {nf === 1 ? "filtro activo" : "filtros activos"}</b></p>
            <div className="g"><div className="gl">Usuario</div><AudUserBox wide value={f.u} usuarios={cat?.usuarios ?? []} onPick={u => set({ u })} /></div>
            <div className="g"><div className="gl">Módulo</div><Select label="Módulo" first="Todos" value={f.m} items={modItems(cat)} cls="w" onChange={m => set({ m })} /></div>
            <div className="g"><div className="gl">Acción</div><Select label="Acción" first="Todas" value={f.a} items={accItems(cat)} cls="w" onChange={a => set({ a })} /></div>
            <div className="g">
              <div className="gl">Fechas (hora de Lima)</div>
              <div className="r2">
                <AudDateField label="Desde" aria="Desde" value={f.d} onChange={d => set({ d })} />
                <AudDateField label="Hasta" aria="Hasta" value={f.h} onChange={h => set({ h })} />
              </div>
              <AudPresets f={f} set={set} largo />
            </div>
            <div className="foot">
              <button type="button" className="btn out" onClick={onClear}>{I(X, 16)}Limpiar filtros</button>
              <button type="button" className="btn" onClick={onClose}>Ver {total} logs</button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
