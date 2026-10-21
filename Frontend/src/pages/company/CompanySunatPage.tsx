import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { TriangleAlert } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { EmpHeader, EmpModeWarning, EmpTabs } from "./empresa/EmpHeader"
import { EmpLoading, EmpForbidden } from "./empresa/EmpStates"
import { EmpNote } from "./empresa/empParts"
import { pl } from "./empresa/empFormat"
import { buildTabs, pickTab, type EmpTabKey } from "./empresa/empTabs"
import { useEmpEstado } from "./empresa/useEmpEstado"
import "../../styles/empresa.css"

const CompanyPage = lazy(() => import("./CompanyPage"))
const BillingPage = lazy(() => import("../billing/BillingPage"))
const BusinessHoursPage = lazy(() => import("./BusinessHoursPage"))
const PaymentsPage = lazy(() => import("../payments/PaymentsPage"))
const VendorsPage = lazy(() => import("../vendors/VendorsPage"))

const NO_ACCESS = "No tienes ninguna pestaña habilitada en esta pantalla."

/** Contenedor de Empresa y horario: cabecera con estado real, barra de pestanas y la pestana activa (carga diferida). */
export default function CompanySunatPage() {
  useDocumentTitle("Empresa y horario")
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const manager = user?.id_role === 1
  const sunat = manager || user?.id_role === 2 || Boolean(user?.area_grants?.includes("empresa_sunat"))
  const payments = manager || Boolean(user?.area_grants?.includes("pagos_pos"))
  const users = user?.email?.trim().toLowerCase() === "cristophercalioro@gmail.com"
  const tabs = buildTabs({ manager, sunat, payments, users })
  const tab = pickTab(tabs, searchParams.get("tab"))

  const estado = useEmpEstado(manager || sunat, manager)
  const host = useRef<HTMLDivElement>(null)
  const [mob, setMob] = useState(false)
  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const ro = new ResizeObserver(([r]) => setMob(Math.round(r.contentRect.width) < 640))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Cambios sin guardar de la pestana activa: avisar con la consecuencia exacta antes de cambiar.
  const [dirty, setDirty] = useState(0)
  const [pending, setPending] = useState<EmpTabKey | null>(null)
  const go = useCallback((k: EmpTabKey) => {
    setPending(null); setDirty(0)
    setSearchParams(k === "company" ? {} : { tab: k })
  }, [setSearchParams])
  const request = (k: EmpTabKey) => { if (k !== tab) { if (dirty > 0) setPending(k); else go(k) } }
  useEffect(() => {
    if (dirty === 0) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const fixed = tab === "company" || tab === "hours"
  const cur = tabs.find(t => t.key === tab)
  const target = tabs.find(t => t.key === pending)
  const tabProps = { mob, ficha: estado.ficha, onDirty: setDirty, onGoto: (k: string) => request(k as EmpTabKey) }

  return (
    <div className={`pg-empresa${fixed ? " fx" : ""}`} ref={host}>
      <EmpHeader title={fixed || !tab ? "h1" : "p"} status={estado.status} statusError={estado.statusError} sheet={estado.sheet} sheetError={estado.sheetError} showSheet={manager} onRefresh={() => void estado.reload()} />
      <EmpTabs tabs={tabs} current={tab} onSelect={request} />
      <EmpModeWarning status={estado.status} />
      {pending && cur && target && (
        <EmpNote
          kind="warn" icon={TriangleAlert}
          acts={<><button type="button" className="btn out" onClick={() => setPending(null)}>Seguir editando</button><button type="button" className="btn dng" onClick={() => go(pending)}>Descartar y cambiar</button></>}
        >
          <strong>Se descartarán {pl(dirty, "cambio")} de {cur.label}</strong>Si pasas a {target.label} ahora, los datos de {cur.label} que no guardaste se pierden.
        </EmpNote>
      )}
      <Suspense fallback={<EmpLoading what="la pestaña" />}>
        {tab === "company" && <CompanyPage {...tabProps} />}
        {tab === "hours" && <BusinessHoursPage {...tabProps} />}
        {tab === "sunat" && <BillingPage />}
        {tab === "payments" && <PaymentsPage />}
        {tab === "users" && <VendorsPage />}
        {!tab && <EmpForbidden reason={NO_ACCESS} role="Gerencia o Administración" />}
      </Suspense>
    </div>
  )
}
