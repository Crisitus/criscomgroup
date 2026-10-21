import { useId, useState } from "react"
import { CircleCheck, Lock, TriangleAlert } from "lucide-react"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import { Btn, I } from "./pagCommon"

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase()

/** Pasar a producción: diálogo propio con la consecuencia exacta (reemplaza window.prompt). */
export function PagProdDialog({ busy, message, onCancel, onConfirm }: { busy: boolean; message: string; onCancel: () => void; onConfirm: (typed: string) => void }) {
  const id = useId()
  const [typed, setTyped] = useState("")
  const ok = norm(typed) === "PRODUCCION"
  return (
    <ErpDialog open onOpenChange={o => { if (!o && !busy) onCancel() }} title="¿Pasar Culqi a Producción?" icon={<span className="pgwarn">{I(TriangleAlert, 22)}</span>}>
      <div className="pg-pagos dlgw">
        <ul>
          <li>Los cobros de la tienda web serán <b>reales</b>, con las llaves <span className="pa-mono">pk_live_</span> y <span className="pa-mono">sk_live_</span>.</li>
          <li>Al guardar, Culqi <b>dejará de usarse</b> en la tienda web hasta que pruebes la conexión y la actives de nuevo.</li>
        </ul>
        <label className="pa-sl" htmlFor={`${id}i`}><span>Escribe <b>PRODUCCIÓN</b> para confirmar</span></label>
        <input id={`${id}i`} className="pa-in" autoComplete="off" spellCheck={false} value={typed} onChange={e => setTyped(e.target.value)} aria-describedby={`${id}h`}
          onKeyDown={e => { if (e.key === "Enter" && ok && !busy) onConfirm(typed) }} />
        <p className="pa-hint" id={`${id}h`}>
          {ok ? <>{I(CircleCheck)}El texto coincide. Ya puedes confirmar.</> : <>{I(Lock)}El botón sigue deshabilitado hasta que el texto coincida (se acepta PRODUCCION, sin tilde ni mayúsculas).</>}
        </p>
        {message && <p className="pa-why pa-bad" role="alert">{I(TriangleAlert)}{message}</p>}
        <div className="pa-acts">
          <Btn out onClick={onCancel} dis={busy}>Cancelar</Btn>
          <Btn dis={!ok} by={`${id}h`} busy={busy} onClick={() => onConfirm(typed)} od="confirmar-produccion">{busy ? "Guardando…" : "Pasar a producción"}</Btn>
        </div>
      </div>
    </ErpDialog>
  )
}
