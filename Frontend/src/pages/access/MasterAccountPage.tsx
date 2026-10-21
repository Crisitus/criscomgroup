import { useLayoutEffect, useRef, useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { MaeDenied } from "./maestra/MaeDenied"
import { MaeScreen } from "./maestra/MaeScreen"
import "../../styles/maestra.css"

/** Entrada fina: la maestra la decide el servidor (es_maestra); el resto ve el 403 completo. */
export default function MasterAccountPage() {
  useDocumentTitle("Cuenta maestra")
  const { user, logout } = useAuth()
  const host = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1200)
  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const ro = new ResizeObserver(([r]) => setWidth(Math.round(r.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div className="pg-maestra" ref={host}>
      {user?.es_maestra ? <MaeScreen logout={logout} mob={width < 640} /> : <MaeDenied />}
    </div>
  )
}
