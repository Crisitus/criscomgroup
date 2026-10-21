import { SearchX, Search } from "lucide-react"
import type { User } from "../../../services/userService"
import { LIMITE, ROLE, roleName, vigencia } from "./usrCommon"
import { Msg, I, Skeleton } from "./UsrParts"
import { UserChips } from "./UsrChips"
import type { Grupo, useUsrList } from "./useUsrList"

type List = ReturnType<typeof useUsrList>
const ESTADOS: [string, string][] = [["", "Todos los estados"], ["activo", "Activa"], ["inactivo", "Desactivada"], ["vigente", "Auditor con acceso vigente"], ["vencido", "Auditor con acceso vencido"], ["elevado", "Administrador elevado"]]
const ROLES: [string, string][] = [["", "Todos los roles"], ...[2, 3, 5, 6, 1].map(r => [String(r), ROLE[r]] as [string, string])]

export function UsrFilters({ l, grupo, disabled }: { l: List; grupo: Grupo; disabled?: boolean }) {
  return (
    <div className="lh">
      <div className="srch">
        {I(Search, 18)}
        <input className="inp" type="search" aria-label="Buscar por nombre o correo" placeholder="Buscar por nombre o correo" value={l.qLive} disabled={disabled} onChange={e => l.setQLive(e.target.value)} />
      </div>
      <div className="fr">
        {grupo === "personal" && (
          <select className="inp" aria-label="Filtrar por rol" value={l.f.rol} disabled={disabled} onChange={e => l.set({ rol: e.target.value })}>
            {ROLES.map(([v, x]) => <option key={v} value={v}>{x}</option>)}
          </select>
        )}
        <select className="inp" aria-label="Filtrar por estado" value={l.f.estado} disabled={disabled} onChange={e => l.set({ estado: e.target.value })}>
          {ESTADOS.map(([v, x]) => <option key={v} value={v}>{x}</option>)}
        </select>
      </div>
    </div>
  )
}

function Row({ u, sel, onPick }: { u: User; sel: boolean; onPick: (id: number) => void }) {
  const v = vigencia(u)
  return (
    <button type="button" className={`row${sel ? " sel" : ""}`} aria-pressed={sel} onClick={() => onPick(u.id_user)}>
      <span className="r1"><span className="nm">{u.name}</span><span className="rc"><UserChips u={u} /></span></span>
      <span className="r2"><span className="rt">{roleName(u)}</span><span className="re">{u.email}</span>{v && <span className="vg">{v}</span>}</span>
    </button>
  )
}

export function UsrRows({ l, selId, onPick, grupo }: { l: List; selId: number | null; onPick: (id: number) => void; grupo: Grupo }) {
  if (l.status === "load") return <div className="rows"><Skeleton /></div>
  if (l.rows.length === 0) {
    const vacio = !l.filtrado
    return (
      <div className="rows">
        <Msg icon={SearchX} title={vacio ? (grupo === "clientes" ? "No hay clientes registrados" : "No hay cuentas de personal") : "Sin resultados"}
          action={vacio ? undefined : <button type="button" className="btn out" onClick={l.clear}>Limpiar filtros</button>}>
          {vacio ? (grupo === "clientes" ? "Los clientes de la tienda aparecen aquí cuando se registran." : "Crea la primera cuenta con «Nueva cuenta».") : "Ninguna cuenta coincide con la búsqueda y los filtros activos."}
        </Msg>
      </div>
    )
  }
  return <div className="rows">{l.rows.map(u => <Row key={u.id_user} u={u} sel={u.id_user === selId} onPick={onPick} />)}</div>
}

export function UsrPager({ l }: { l: List }) {
  if (l.status !== "ok" || l.total === 0) return null
  const a = (l.page - 1) * LIMITE + 1
  const b = Math.min(l.page * LIMITE, l.total)
  return (
    <div className="pag">
      <span>Mostrando {a}-{b} de {l.total} · hora de Lima</span>
      <div>
        <button type="button" className="btn out" aria-disabled={l.page <= 1} onClick={() => { if (l.page > 1) l.setPage(l.page - 1) }}>Anterior</button>
        <button type="button" className="btn out" aria-disabled={l.page >= l.pages} onClick={() => { if (l.page < l.pages) l.setPage(l.page + 1) }}>Siguiente</button>
      </div>
    </div>
  )
}
