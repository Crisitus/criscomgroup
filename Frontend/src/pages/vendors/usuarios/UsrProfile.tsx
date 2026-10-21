import { useState } from "react"
import { Clock, Lock, Store } from "lucide-react"
import { configureAccessProfile, type User } from "../../../services/userService"
import type { Rule } from "./usrRules"
import { enPrueba, fmtD, isFutureLima, inDays } from "./usrCommon"
import type { Actions } from "./useUsrActions"
import type { AffBusiness } from "./useUsrAffiliates"
import { Chip, Field, I, Seg, Spin, Why } from "./UsrParts"
import { UsrExpiry } from "./UsrExpiry"

interface P { u: User; edit: Rule; act: Actions; onChanged: () => void; biz?: AffBusiness; goAff: (id: number) => void }
type Tipo = "fisico" | "virtual" | "afiliado"
const TIPOS: { v: Tipo; x: string }[] = [{ v: "fisico", x: "Físico" }, { v: "virtual", x: "Virtual" }, { v: "afiliado", x: "Afiliado" }]
const SESIONES = "Aplicar un perfil cierra las sesiones abiertas de la cuenta."

function Vendedor({ u, edit, act, onChanged, biz, goAff }: P) {
  const [nom, setNom] = useState("")
  const [ask, setAsk] = useState(false)
  const first = u.name.split(" ")[0]
  const apply = async (tipo: Tipo, nombre?: string) => {
    const r = await act.run("perfil", () => configureAccessProfile({ id: u.id_user, data: { id_role: 3, tipo_vendedor: tipo, ...(nombre ? { nombre_comercial: nombre } : {}) } }),
      { title: "Guardado", text: `${first} ahora es vendedor ${tipo === "fisico" ? "físico" : tipo}.` })
    if (r.ok) { setAsk(false); setNom(""); onChanged() }
  }
  const pick = (v: Tipo) => { if (v === u.tipo_vendedor) return; if (v === "afiliado") setAsk(true); else void apply(v) }
  const opts = TIPOS.map(o => ({ ...o, off: edit.ok ? undefined : edit.why }))
  return (
    <>
      <div><span className="lab2">Tipo de vendedor</span><Seg label="Tipo de vendedor" value={ask ? "afiliado" : u.tipo_vendedor ?? ""} opts={opts} onPick={pick} /></div>
      {!edit.ok && <Why icon={Lock}>{edit.why}</Why>}
      {ask && (
        <div className="ap">
          <Field id="usr-nc" label="Nombre comercial del negocio" error={act.errs.nombre_comercial}>
            <input id="usr-nc" className={`inp${act.errs.nombre_comercial ? " bad" : ""}`} value={nom} maxLength={120} onChange={e => setNom(e.target.value)} />
          </Field>
          <Why>Se crea el negocio afiliado con comisión de 8 % y 2 meses de prueba gratuita.</Why>
          <div className="acts">
            <button type="button" className="btn pri" aria-disabled={!nom.trim() || act.busy === "perfil"} onClick={() => { if (nom.trim()) void apply("afiliado", nom.trim()) }}>{act.busy === "perfil" && <Spin />}Convertir en afiliado</button>
            <button type="button" className="btn out" onClick={() => setAsk(false)}>Cancelar</button>
          </div>
        </div>
      )}
      {u.tipo_vendedor === "afiliado" && (
        <dl className="kv">
          <dt>Negocio afiliado</dt><dd>{biz?.nombre_comercial ?? "—"}</dd>
          <dt>Estado</dt>
          <dd>{biz ? <><Chip t={biz.estado === "activo" ? "ok" : biz.estado === "suspendido" ? "wn" : "nu"} icon={Store} x={biz.estado[0].toUpperCase() + biz.estado.slice(1)} />
            {enPrueba(biz.prueba_finaliza_en) && <Chip t="wn" icon={Clock} x={`En prueba hasta ${fmtD(biz.prueba_finaliza_en)}`} />}</> : "—"}</dd>
          <dt>Comisión</dt><dd>{Number(biz?.comision_porcentaje ?? u.comision_servicio_porcentaje ?? 8)} %</dd>
        </dl>
      )}
      {u.affiliate_business_id && <div><button type="button" className="btn out" onClick={() => goAff(u.affiliate_business_id!)}>{I(Store, 16)}Ver negocio en Afiliados</button></div>}
      <Why>{SESIONES} Si deja de ser afiliado, su negocio queda suspendido.</Why>
    </>
  )
}

function Auditor({ u, edit, act, onChanged }: P) {
  const [v, setV] = useState(u.acceso_expira_en ?? inDays(7))
  const save = async () => {
    const r = await act.run("perfil", () => configureAccessProfile({ id: u.id_user, data: { id_role: 5, acceso_expira_en: v } }), { title: "Guardado", text: `El acceso de ${u.name.split(" ")[0]} fue actualizado.` })
    if (r.ok) onChanged()
  }
  return (
    <>
      {edit.ok ? <UsrExpiry value={v} onChange={setV} label="Acceso del auditor" error={act.errs.acceso_expira_en} /> : <Why icon={Lock}>{edit.why}</Why>}
      {edit.ok && <div className="acts"><button type="button" className="btn out" aria-disabled={act.busy === "perfil" || !isFutureLima(v)} onClick={() => { if (isFutureLima(v)) void save() }}>{act.busy === "perfil" ? <Spin /> : I(Clock, 16)}Actualizar vencimiento</button></div>}
      <Why>{SESIONES}</Why>
    </>
  )
}

function Tecnico({ u, edit, act, onChanged }: P) {
  const [tel, setTel] = useState(u.telefono ?? "")
  const ok = /^9\d{8}$/.test(tel)
  const save = async () => {
    const r = await act.run("perfil", () => configureAccessProfile({ id: u.id_user, data: { id_role: 6, telefono: tel } }), { title: "Guardado", text: "Celular del técnico actualizado." })
    if (r.ok) onChanged()
  }
  return (
    <>
      <Field id="usr-tel" label="Celular del técnico (9 dígitos)" error={act.errs.telefono}>
        <input id="usr-tel" className={`inp${act.errs.telefono ? " bad" : ""}`} inputMode="numeric" maxLength={9} value={tel} disabled={!edit.ok} onChange={e => setTel(e.target.value.replace(/\D/g, ""))} />
      </Field>
      {!edit.ok ? <Why icon={Lock}>{edit.why}</Why> : tel !== (u.telefono ?? "") && (
        <div className="acts"><button type="button" className="btn out" aria-disabled={!ok || act.busy === "perfil"} onClick={() => { if (ok) void save() }}>Guardar celular</button>{!ok && <Why>Debe tener 9 dígitos y empezar en 9.</Why>}</div>
      )}
      <Why>{SESIONES}</Why>
    </>
  )
}

export function UsrProfile(p: P) {
  if (p.u.id_role === 3) return <Vendedor {...p} />
  if (p.u.id_role === 5) return <Auditor {...p} />
  if (p.u.id_role === 6) return <Tecnico {...p} />
  return null
}
