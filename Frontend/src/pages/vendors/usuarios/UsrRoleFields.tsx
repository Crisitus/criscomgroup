import { Lock } from "lucide-react"
import { inDays } from "./usrCommon"
import { Field, Seg, Why } from "./UsrParts"
import { UsrExpiry } from "./UsrExpiry"
import type { FormState } from "./useUsrForm"

const TIPOS = [{ v: "fisico" as const, x: "Físico" }, { v: "virtual" as const, x: "Virtual" }, { v: "afiliado" as const, x: "Afiliado" }]

/** Campos que mudan según el rol elegido (solo los que ese rol exige). */
export function UsrRoleFields({ f, set, errs }: { f: FormState; set: (c: Partial<FormState>) => void; errs: Record<string, string> }) {
  if (f.role === 3) {
    return (
      <div className="rg">
        <span className="lab2">Tipo de vendedor</span>
        <Seg label="Tipo de vendedor" value={f.tipo} opts={TIPOS} onPick={v => set({ tipo: v })} />
        {errs.tipo_vendedor && <p className="fe">{errs.tipo_vendedor}</p>}
        {f.tipo === "afiliado" && (
          <>
            <Field id="f-nc" label="Nombre comercial del negocio" error={errs.nombre_comercial}>
              <input id="f-nc" className={`inp${errs.nombre_comercial ? " bad" : ""}`} value={f.nombre_comercial} maxLength={120} onChange={e => set({ nombre_comercial: e.target.value })} />
            </Field>
            <Why>Comisión fija de 8 % y 2 meses de prueba gratuita.</Why>
          </>
        )}
      </div>
    )
  }
  if (f.role === 5) return <UsrExpiry value={f.expira || inDays(7)} onChange={v => set({ expira: v })} label="Vencimiento del acceso" error={errs.acceso_expira_en} />
  if (f.role === 6) {
    return (
      <Field id="f-tel" label="Celular del técnico (9 dígitos)" error={errs.telefono}>
        <input id="f-tel" className={`inp${errs.telefono ? " bad" : ""}`} inputMode="numeric" maxLength={9} value={f.telefono} onChange={e => set({ telefono: e.target.value.replace(/\D/g, "") })} />
      </Field>
    )
  }
  if (f.role === 2) return <Why icon={Lock}>El superusuario temporal se concede después, desde el detalle de la cuenta.</Why>
  return null
}
