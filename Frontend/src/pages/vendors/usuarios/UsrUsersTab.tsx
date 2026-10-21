import { useCallback, useEffect, useRef, useState } from "react"
import { Lock, LogIn, RefreshCw, ServerCrash, UserRound } from "lucide-react"
import type { User } from "../../../services/userService"
import type { Actor } from "./usrRules"
import type { Banner, Guard } from "./UsrParts"
import { Msg } from "./UsrParts"
import type { Grupo, useUsrList } from "./useUsrList"
import type { useUsrAffiliates } from "./useUsrAffiliates"
import { UsrFilters, UsrPager, UsrRows } from "./UsrList"
import { UsrDetail } from "./UsrDetail"
import { UsrForm } from "./UsrForm"

interface P {
  list: ReturnType<typeof useUsrList>; aff: ReturnType<typeof useUsrAffiliates>; grupo: Grupo; actor: Actor; mob: boolean
  creating: boolean; setCreating: (v: boolean) => void; setGrupo: (g: Grupo) => void; goAff: (id: number) => void; goReq: () => void; onFull: (v: boolean) => void
}

/** Pantalla de error de la bandeja: 500 con Reintentar, 403 con el motivo del servidor, 401 sesión vencida (tres estados distintos). */
function ListError({ l }: { l: P["list"] }) {
  if (l.status === "forbidden") return <Msg icon={Lock} tone="wn" title="Sin permiso para ver las cuentas">{l.msg || "Tu cuenta no tiene permiso para esta pantalla."}</Msg>
  if (l.status === "unauth") return <Msg icon={LogIn} tone="wn" title="Tu sesión terminó">Vuelve a iniciar sesión para continuar.</Msg>
  return <Msg icon={ServerCrash} tone="er" title="No se pudo cargar la lista" action={<button type="button" className="btn out" onClick={() => void l.load()}><RefreshCw className="ic" size={16} />Reintentar</button>}>{l.msg}</Msg>
}

export function UsrUsersTab({ list, aff, grupo, actor, mob, creating, setCreating, setGrupo, goAff, goReq, onFull }: P) {
  const [sel, setSel] = useState<number | null>(null)
  const [view, setView] = useState<"list" | "detail">("list")
  const [known, setKnown] = useState<User | null>(null)
  const [notice, setNotice] = useState<Banner | null>(null)
  const [pend, setPend] = useState<null | (() => void)>(null)
  const dirty = useRef(false)
  const onDirty = useCallback((d: boolean) => { dirty.current = d }, [])

  const found = list.rows.find(r => r.id_user === sel) ?? (known && known.id_user === sel ? known : null)
  useEffect(() => { if (found && list.rows.some(r => r.id_user === found.id_user)) setKnown(found) }, [found, list.rows])
  useEffect(() => {
    if (mob || creating || list.status !== "ok" || list.fetching) return
    if (sel == null || (!list.rows.some(r => r.id_user === sel) && known?.id_user !== sel)) setSel(list.rows[0]?.id_user ?? null)
  }, [list.status, list.fetching, list.rows, mob, creating, sel, known])

  const guarded = (fn: () => void) => { if (dirty.current) setPend(() => fn); else fn() }
  const guard: Guard | null = pend ? { text: "Si continúas se pierden los datos que escribiste.", onKeep: () => setPend(null), onDiscard: () => { dirty.current = false; const f = pend; setPend(null); f() } } : null
  const pick = (id: number) => guarded(() => { setNotice(null); setCreating(false); setSel(id); if (mob) setView("detail") })
  const back = () => guarded(() => { setCreating(false); setView("list") })
  useEffect(() => { if (creating) { setView("detail"); setNotice(null) } }, [creating])
  useEffect(() => { onFull(mob && (view === "detail" || creating)) }, [mob, view, creating, onFull])
  const refresh = () => { void list.load(true); void aff.load() }
  const created = (u: User) => {
    setGrupo(u.id_role === 4 ? "clientes" : "personal"); list.clear(); setKnown(u); setSel(u.id_user); setCreating(false); refresh()
    setNotice({ tone: "ok", title: "Cuenta creada", text: `${u.name} ya puede iniciar sesión con la contraseña que definiste.` })
  }
  const deleted = () => { setSel(null); setKnown(null); setView("list"); setNotice({ tone: "ok", title: "Cuenta eliminada", text: "La cuenta se eliminó de forma definitiva." }); refresh() }

  if (list.status === "forbidden" || list.status === "unauth" || list.status === "error") return <section className="lp"><ListError l={list} /></section>

  const panel = creating ? <UsrForm actor={actor} mob={mob} guard={guard} onCancel={back} onCreated={created} onDirty={onDirty} />
    : found ? <UsrDetail key={found.id_user} u={found} actor={actor} biz={aff.byId(found.affiliate_business_id)} mob={mob} guard={guard} notice={notice} onNotice={() => setNotice(null)}
        onBack={back} onChanged={refresh} onDeleted={deleted} onDirty={onDirty} goAff={goAff} goReq={goReq} />
    : <section className="dp"><Msg icon={UserRound} title="Selecciona una cuenta">Elige una cuenta de la lista para ver sus datos, rol y permisos.</Msg></section>

  const lista = (
    <section className="lp" aria-label="Cuentas">
      <UsrFilters l={list} grupo={grupo} />
      <UsrRows l={list} selId={creating ? null : sel} onPick={pick} grupo={grupo} />
      <UsrPager l={list} />
    </section>
  )
  if (mob) return view === "detail" ? panel : lista
  return <div className="bd">{lista}{panel}</div>
}
