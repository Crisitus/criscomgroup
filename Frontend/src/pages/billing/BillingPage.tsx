import { useLayoutEffect, useRef, useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { MobileRucLink, ModeBanner, NoticeBanner, SunHeader } from "./sunat/SunHeader"
import { SunDocs } from "./sunat/SunDocs"
import { Ruc20Dialog, SeriesDialog } from "./sunat/SunDialogs"
import { SunEmitters } from "./sunat/SunEmitters"
import { SunStrip } from "./sunat/SunStrip"
import { useSunData } from "./sunat/useSunData"
import { useSunDocs } from "./sunat/useSunDocs"
import { useSunEmitters } from "./sunat/useSunEmitters"
import "../../styles/sunat.css"

/** SUNAT y facturación: pestaña de Administración › Empresa (solo configuración y estado; no envía nada a SUNAT). */
export default function BillingPage() {
  useDocumentTitle("SUNAT y facturación")
  const { user } = useAuth()
  const rol1 = user?.id_role === 1
  const data = useSunData()
  const docs = useSunDocs()
  const reloadAll = async () => { await Promise.all([data.reload(), docs.reload()]) }
  const ctl = useSunEmitters(data.reload)

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

  const emi = data.emi.data
  const invalid = [data.conn.data, emi?.sunat].find(s => s && s.mode_valid === false)
  const busy = data.conn.status === "loading" || data.emi.status === "loading" || docs.status === "loading"
  const editing = emi?.emisores.find(e => e.id_company === ctl.ask?.id)

  return (
    <div className="pg-sunat" ref={host}>
      <div className="pg">
        <SunHeader rol1={rol1} mob={mob} busy={busy} onRefresh={() => void reloadAll()} />
        {invalid && <ModeBanner text={invalid.warning || "SUNAT_MODE tiene un valor inválido: se usa modo pruebas (beta)."} />}
        {ctl.notice && <NoticeBanner notice={ctl.notice} onClose={ctl.closeNotice} />}
        <SunStrip block={data.conn} onRetry={() => void data.retryConn()} />
        {mob && <MobileRucLink rol1={rol1} />}
        <div className="cols">
          <SunEmitters block={data.emi} ctl={ctl} mob={mob} onRetry={() => void data.retryEmi()} />
          <div className="rcol"><SunDocs docs={docs} mob={mob} /></div>
        </div>
      </div>
      <SeriesDialog emisor={editing} ctl={ctl} />
      <Ruc20Dialog n={emi?.ruc20_habilitados_pendientes ?? 0} ctl={ctl} />
    </div>
  )
}
