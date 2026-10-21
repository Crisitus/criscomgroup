import type { Product } from "../../services/productService"
import { CircleAlert } from "lucide-react"
import { COMP, DOCS, I, PRUEBA, PRUEBAS, TIPO, okTest } from "./acqShared"
import { ProductPicker, elegibles } from "./AcqPick"
import type { Form } from "./acqFormState"

type P = { f: Form; set: (k: string, v: string) => void; errs: Record<string, string> }
const Lab = ({ l, req }: { l: string; req?: boolean }) => <span>{l}{req && <i aria-hidden="true"> *</i>}</span>
const Err = ({ id, m }: { id: string; m?: string }) => m ? <span className="why bad" id={`${id}-e`} role="alert">{I(CircleAlert, 16)}<span>{m}</span></span> : null

export function Fld({ id, l, c, f, set, errs, req, num, dis, hint, area }: P & { id: string; l: string; c?: string; req?: boolean; num?: boolean; dis?: boolean; hint?: string; area?: boolean }) {
  const e = errs[id]
  const common = { id: `f-${id}`, value: f.s[id], "aria-required": req || undefined, "aria-invalid": e ? true : undefined, "aria-describedby": e ? `${id}-e` : hint ? `${id}-h` : undefined, onChange: (ev: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => set(id, ev.target.value) }
  return (
    <label className={`fld ${c || ""}`} htmlFor={`f-${id}`}><Lab l={l} req={req} />
      {area ? <textarea className="ta" rows={2} {...common} /> : <input className={`in${num ? " num" : ""}`} readOnly={dis} inputMode={num ? "decimal" : undefined} {...common} />}
      {hint && !e && <small className="hint" id={`${id}-h`}>{hint}</small>}<Err id={id} m={e} /></label>
  )
}
export function Opts({ name, list, value, onChange, c }: { name: string; list: [string, string][]; value: string; onChange: (v: string) => void; c?: string }) {
  return (
    <div className={`fld ${c || ""}`}><Lab l={name} req /><div className="opts" role="radiogroup" aria-label={name}>
      {list.map(([v, l]) => <button type="button" key={v} className="opt" role="radio" aria-checked={v === value} onClick={() => onChange(v)}>{l}</button>)}
    </div></div>
  )
}
export const Sw = ({ t, on, dis, onClick }: { t: string; on: boolean; dis?: boolean; onClick?: () => void }) => (
  <button type="button" className="sw" role="switch" aria-checked={on} aria-disabled={dis || undefined} onClick={() => { if (!dis) onClick?.() }}><span className="tr" /><span>{t}</span></button>
)

export function Step1(p: P) {
  const compra = p.f.s.tipo_operacion === "compra"
  return (
    <div className="frm">
      <Opts c="s3" name="Tipo de documento" list={DOCS.map(d => [d, d])} value={p.f.s.transferente_tipo_documento} onChange={v => p.set("transferente_tipo_documento", v)} />
      <Fld {...p} id="transferente_numero_documento" l="Número de documento" c="s3" req />
      <Fld {...p} id="transferente_nombre" l="Nombre o razón social" c="s3" req />
      <Fld {...p} id="transferente_contacto" l="Contacto" c="s3" />
      <div className="sh sep">Operación</div>
      <Opts c="s6" name="Tipo de operación" list={Object.entries(TIPO)} value={p.f.s.tipo_operacion} onChange={v => p.set("tipo_operacion", v)} />
      <Fld {...p} id="monto_adquisicion" l="Monto de adquisición (S/)" c="s2" req num dis={!compra} hint={compra ? undefined : "Donación y cesión van con monto S/ 0.00."} />
      <Fld {...p} id="medio_pago" l="Medio de pago" c="s2" dis={!compra} />
      <Fld {...p} id="referencia_pago" l="Referencia de pago" c="s2" dis={!compra} />
    </div>
  )
}
export function Step2(p: P) {
  return (
    <div className="frm">
      <label className="fld s2"><Lab l="Tipo de componente" req /><select className="sl" value={p.f.s.tipo_componente} onChange={e => p.set("tipo_componente", e.target.value)}>{Object.entries(COMP).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <Fld {...p} id="marca" l="Marca" c="s2" req />
      <Fld {...p} id="modelo" l="Modelo" c="s2" req />
      <Fld {...p} id="numero_serie" l="Número de serie" c="s3" req />
      <Fld {...p} id="capacidad" l="Capacidad o configuración" c="s3" />
      <Fld {...p} id="estado_recepcion" l="Estado de recepción" c="s6" req area />
      <Fld {...p} id="accesorios" l="Accesorios" c="s6" />
    </div>
  )
}
const MET: [string, string][] = [["smart_salud_porcentaje", "Salud SMART (%)"], ["tbw_escrito", "TBW escrito"], ["tbw_nominal", "TBW nominal"], ["horas_encendido", "Horas encendido"], ["ciclos_encendido", "Ciclos encendido"], ["ciclos_bateria", "Ciclos batería"], ["capacidad_bateria_diseno", "Batería diseño"], ["capacidad_bateria_actual", "Batería actual"]]
export function Step3(p: P) {
  return (
    <div className="frm c4">
      <Opts c="s6" name="Prueba funcional" list={PRUEBAS.map(k => [k, PRUEBA[k][0]])} value={p.f.s.prueba_funcional} onChange={v => p.set("prueba_funcional", v)} />
      <div className="sh sep s6">Métricas del equipo</div>
      {MET.map(([k, l]) => <Fld key={k} {...p} id={k} l={l} num />)}
      <Fld {...p} id="observaciones_tecnicas" l="Observaciones técnicas" c="s6" area />
    </div>
  )
}
export function Step4(p: P & { products: Product[]; setF: (fn: (f: Form) => Form) => void }) {
  const { f, setF, products } = p
  const prod = products.find(x => x.id_producto === f.producto)
  const can = okTest({ prueba_funcional: f.s.prueba_funcional as never }) && !!prod
  const why = !okTest({ prueba_funcional: f.s.prueba_funcional as never }) ? "La prueba funcional debe estar Aprobada u Observada." : "Elige un producto para poder ingresar al stock."
  return (
    <div className="frm">
      <Fld {...p} id="procedencia_declarada" l="Procedencia declarada" c="s6" req area />
      <div className="s2"><Sw t="Declaración de propiedad" on={f.propiedad} onClick={() => setF(x => ({ ...x, propiedad: !x.propiedad }))} /></div>
      <div className="s2"><Sw t="Declaración no habitual" on={f.nohab} onClick={() => setF(x => ({ ...x, nohab: !x.nohab }))} /></div>
      <Fld {...p} id="formulario_820" l="Formulario 820" c="s2" />
      {p.errs.propiedad && <span className="why bad s6" role="alert">{I(CircleAlert, 16)}<span>{p.errs.propiedad}</span></span>}
      <div className="sh sep s6">Inventario</div>
      <div className="s6"><ProductPicker products={elegibles(products)} value={f.producto} onChange={id => setF(x => ({ ...x, producto: id, ingresar: id != null && x.ingresar }))} label="Producto del inventario" none err={!!p.errs.producto} /></div>
      <div className="s6"><Sw t="Ingresar al stock al registrar" on={can && f.ingresar} dis={!can} onClick={() => setF(x => ({ ...x, ingresar: !x.ingresar }))} />
        {!can && <div className="why" id="ing-why">{I(CircleAlert, 16)}<span>{why}</span></div>}
        {p.errs.producto && <div className="why bad" role="alert">{I(CircleAlert, 16)}<span>{p.errs.producto}</span></div>}</div>
    </div>
  )
}
