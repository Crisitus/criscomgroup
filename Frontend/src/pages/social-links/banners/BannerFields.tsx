import { CircleCheck, EyeOff } from "lucide-react"
import { I } from "../shared"

export interface Meta { titulo: string; orden: string; activo: boolean }

export function BannerFields({ meta, onMeta, edit, ordenOk }: { meta: Meta; onMeta: (m: Meta) => void; edit: boolean; ordenOk: boolean }) {
  return (
    <>
      <div className="fl">
        <label htmlFor="f-t"><span>Título</span><span className="mut">{meta.titulo.length}/120</span></label>
        <input className="in" id="f-t" maxLength={120} value={meta.titulo} placeholder="Opcional · hasta 120 caracteres" onChange={e => onMeta({ ...meta, titulo: e.target.value })} />
      </div>
      <div className="row2">
        <div className="fl">
          <label htmlFor="f-o">Orden</label>
          <input className={`in${ordenOk ? "" : " bad"}`} id="f-o" type="number" min={0} max={9999} step={1} value={meta.orden}
            aria-invalid={!ordenOk || undefined} aria-describedby="f-o-h" onChange={e => onMeta({ ...meta, orden: e.target.value })} />
          <span className="mut" id="f-o-h">{edit ? "0 a 9999 · el menor sale primero" : "Siguiente número libre · 0 a 9999"}</span>
        </div>
        <div className="fl">
          <span className="lb">Estado</span>
          <button type="button" className="sw" role="switch" aria-checked={meta.activo} onClick={() => onMeta({ ...meta, activo: !meta.activo })}>
            <span className="tr" />{meta.activo ? <span className="st ok">{I(CircleCheck, 16)}Publicado</span> : <span className="st neu">{I(EyeOff, 16)}Oculto</span>}
          </button>
        </div>
      </div>
    </>
  )
}
