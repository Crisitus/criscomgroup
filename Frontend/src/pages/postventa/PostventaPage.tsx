import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Lock } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { PvDetailCard, PvDetailMobile } from "./PvDetail"
import { PvList } from "./PvList"
import { PvPager } from "./PvPager"
import { I } from "./pvParts"
import { usePostventaDetail } from "./usePostventaDetail"
import { usePostventaList } from "./usePostventaList"
import "../../styles/postventa.css"

export default function PostventaPage() {
  useDocumentTitle("Cambios y garantías")
  const { user } = useAuth()
  const role = user?.id_role ?? 4
  // Misma regla que el backend (PUT): roles 1 y 2 o concesión del área; Auditoría (5) solo lee.
  const canWrite = role === 1 || role === 2 || !!user?.area_grants?.includes("atencion_cliente")

  const list = usePostventaList()
  const det = usePostventaDetail(() => void list.load(true))
  const host = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1200)
  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const ro = new ResizeObserver(([r]) => setWidth(Math.round(r.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const mob = width < 640

  // En escritorio se abre el primer caso al cargar, como en el diseño (una sola vez).
  const first = useRef(true)
  useEffect(() => {
    if (mob || !first.current || list.status !== "ok") return
    first.current = false
    if (!det.selId && list.rows.length) det.open(list.rows[0].id_solicitud)
  }, [mob, list.status, list.rows, det])

  const inDetail = mob && det.selId != null
  const lead = !canWrite ? <span className="tag">{I(Lock, 12)}Solo lectura</span> : null
  const props = { det, list, role, canWrite, mob }

  return (
    <div className="pg-postventa fx" ref={host}>
      <div className="pg">
        {!inDetail && (
          <div className="hd">
            <h1>Cambios y garantías</h1>
            {mob ? <div className="pgr">{lead}</div> : <PvPager list={list} lead={lead} />}
          </div>
        )}
        {inDetail
          ? <PvDetailMobile {...props} />
          : <div className="md"><PvList list={list} selId={mob ? null : det.selId} mob={mob} onPick={det.request} />{!mob && <PvDetailCard {...props} />}</div>}
      </div>
    </div>
  )
}
