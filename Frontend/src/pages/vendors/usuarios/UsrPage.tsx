import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { Plus } from "lucide-react"
import { useAuth } from "../../../contexts/AuthContext"
import { useDocumentTitle } from "../../../hooks/useDocumentTitle"
import type { Actor } from "./usrRules"
import type { Tab } from "./usrCommon"
import { useUsrList, type Grupo } from "./useUsrList"
import { useUsrAffiliates } from "./useUsrAffiliates"
import { useUsrRequests } from "./useUsrRequests"
import { I } from "./UsrParts"
import { UsrUsersTab } from "./UsrUsersTab"
import { UsrRequests } from "./UsrRequests"
import { UsrAffiliates } from "./UsrAffiliates"
import "../../../styles/usuarios.css"

/** Usuarios y afiliados. `embedded` (o una ruta distinta de /vendors, como la pestaña de Empresa) oculta el h1 propio. */
export default function UsrPage({ embedded }: { embedded?: boolean }) {
  const { pathname } = useLocation()
  const emb = embedded ?? !/\/vendors\/?$/.test(pathname)
  useDocumentTitle(emb ? "Empresa" : "Usuarios y afiliados")
  const { user } = useAuth()
  const actor: Actor = { maestra: !!user?.es_maestra, id: Number(user?.id ?? 0) }
  const [tab, setTab] = useState<Tab>("usuarios")
  const [grupo, setGrupo] = useState<Grupo>("personal")
  const [creating, setCreating] = useState(false)
  const [full, setFull] = useState(false)
  const [focusAff, setFocusAff] = useState<number | null>(null)
  const list = useUsrList(grupo)
  const reqs = useUsrRequests()
  const aff = useUsrAffiliates()
  const [width, setWidth] = useState(1200)
  const host = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const ro = new ResizeObserver(([r]) => setWidth(Math.round(r.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const mob = width < 640
  const onFull = useCallback((v: boolean) => setFull(v), [])
  const nueva = () => { setTab("usuarios"); setCreating(true) }

  const tabs: [Tab, string, number][] = [["usuarios", "Usuarios", list.conteos.personal], ["solicitudes", "Solicitudes de acceso", reqs.counts.pending], ["afiliados", "Afiliados", aff.porVencer]]
  const newBtn = <button type="button" className="btn pri" onClick={nueva}>{I(Plus, 16)}<span>Nueva cuenta</span></button>
  const showHead = !(mob && full && tab === "usuarios")

  return (
    <div className={`pg-usuarios fx${emb ? " emb" : ""}`} ref={host}>
      <div className="pg">
        {showHead && !emb && <div className="hd"><h1>Usuarios y afiliados</h1>{newBtn}</div>}
        {showHead && (
          <div className="tabs">
            <div className="tlist" role="tablist" aria-label="Secciones">
              {tabs.map(([v, x, n]) => (
                <button key={v} type="button" role="tab" id={`usr-tab-${v}`} className="tab" aria-selected={tab === v} aria-controls={`usr-panel-${v}`} onClick={() => setTab(v)}>{x}<span className="cnt" aria-label={`${n}`}>{n}</span></button>
              ))}
            </div>
            {tab === "usuarios" && (
              <div className="seg" role="radiogroup" aria-label="Grupo de cuentas">
                <button type="button" role="radio" aria-checked={grupo === "personal"} onClick={() => setGrupo("personal")}>Personal<b>{list.conteos.personal}</b></button>
                <button type="button" role="radio" aria-checked={grupo === "clientes"} onClick={() => setGrupo("clientes")}>Clientes<b>{list.conteos.clientes}</b></button>
              </div>
            )}
            {emb && newBtn}
          </div>
        )}
        <div className="tp" role="tabpanel" id={`usr-panel-${tab}`} aria-labelledby={`usr-tab-${tab}`}>
          {tab === "usuarios" && <UsrUsersTab list={list} aff={aff} grupo={grupo} actor={actor} mob={mob} creating={creating} setCreating={setCreating} setGrupo={setGrupo}
            goAff={id => { setFocusAff(id); setTab("afiliados") }} goReq={() => setTab("solicitudes")} onFull={onFull} />}
          {tab === "solicitudes" && <UsrRequests actor={actor} q={reqs} />}
          {tab === "afiliados" && <UsrAffiliates a={aff} actor={actor} focus={focusAff} />}
        </div>
      </div>
    </div>
  )
}
