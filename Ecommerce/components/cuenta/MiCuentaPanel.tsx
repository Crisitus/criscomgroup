"use client"

// /mi-cuenta (port criscom-ecom-cuenta): pestañas Datos - Mis pedidos - Mis
// solicitudes. Sin contadores inventados ni edición de perfil (no hay endpoint).
// El chequeo de cuenta maestra por correo literal se conserva tal cual (link /erp/).
import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Info, LogOut, ShieldCheck, LayoutDashboard } from "lucide-react"
import { ecommerceAuthService, type User } from "@/services/ecommerceApi"
import { getMisPedidos, getMisSolicitudes, es401, type PedidoCuenta, type MisSolicitudesResp } from "./cuentaApi"
import { Al } from "./CuentaBits"
import PedidosTab from "./PedidosTab"
import SolicitudesTab from "./SolicitudesTab"

const CORREO_MAESTRO = "cristophercalioro@gmail.com"

const TABS = ["datos", "pedidos", "solicitudes"] as const
type Tab = (typeof TABS)[number]

const ROL_LABEL: Record<number, string> = {
  1: "Administrador", 2: "Administrador", 3: "Vendedor", 4: "Cliente",
}

const MiCuentaPanel = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? "") ? (tabParam as Tab) : "datos"
  const avisoYaSesion = searchParams.get("aviso") === "ya-sesion"

  const [user, setUser] = useState<User | null>(null)
  const [pedidos, setPedidos] = useState<PedidoCuenta[] | null>(null)
  const [solicitudes, setSolicitudes] = useState<MisSolicitudesResp | null>(null)
  const [paginaSol, setPaginaSol] = useState(1)
  const [errorPedidos, setErrorPedidos] = useState(false)
  const [errorSolicitudes, setErrorSolicitudes] = useState(false)

  useEffect(() => {
    document.title = "Mi cuenta · Criscom Group"
    const currentUser = ecommerceAuthService.getCurrentUser()
    if (!currentUser) {
      router.replace("/iniciar-sesion?redirect=/mi-cuenta&aviso=sesion")
      return
    }
    setUser(currentUser)
  }, [router])

  const cargarPedidos = useCallback(async () => {
    setErrorPedidos(false)
    try {
      setPedidos(await getMisPedidos())
    } catch (e) {
      if (es401(e)) {
        ecommerceAuthService.logout()
        router.replace("/iniciar-sesion?redirect=/mi-cuenta&aviso=sesion")
        return
      }
      setErrorPedidos(true)
      setPedidos(null)
    }
  }, [router])

  const cargarSolicitudes = useCallback(async (pagina: number) => {
    setErrorSolicitudes(false)
    setSolicitudes(null)
    try {
      setSolicitudes(await getMisSolicitudes(pagina, 10))
    } catch (e) {
      if (es401(e)) {
        ecommerceAuthService.logout()
        router.replace("/iniciar-sesion?redirect=/mi-cuenta&aviso=sesion")
        return
      }
      setErrorSolicitudes(true)
    }
  }, [router])

  useEffect(() => {
    if (!user) return
    void cargarPedidos()
    void cargarSolicitudes(paginaSol)
  }, [user, paginaSol, cargarPedidos, cargarSolicitudes])

  if (!user) return null

  const esMaestra = user.email.trim().toLowerCase() === CORREO_MAESTRO
  const tieneErp = user.id_role === 3 || esMaestra

  const cambiarTab = (t: Tab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (t === "datos") params.delete("tab")
    else params.set("tab", t)
    params.delete("aviso")
    const qs = params.toString()
    router.replace(`/mi-cuenta${qs ? `?${qs}` : ""}`)
  }

  const contador = (n: number | null) =>
    n == null ? null : <span className="cnt">{n}</span>

  const handleLogout = () => {
    ecommerceAuthService.logout()
    router.push("/")
  }

  return (
    <>
      <div className="ph">
        <h1>Mi cuenta</h1>
        <button className="btn o" type="button" onClick={handleLogout}>
          <LogOut size={16} strokeWidth={1.75} aria-hidden />
          Cerrar sesión
        </button>
      </div>
      {avisoYaSesion && (
        <div className="stack" style={{ marginBottom: 20 }}>
          <Al tono="l" icon={Info} role="status">
            Ya tenías la sesión iniciada, por eso te llevamos a tu cuenta.
          </Al>
        </div>
      )}
      <div className="tabs" role="tablist" aria-label="Secciones de Mi cuenta">
        <button className="tab" role="tab" aria-selected={tab === "datos"} onClick={() => cambiarTab("datos")}>
          Datos
        </button>
        <button className="tab" role="tab" aria-selected={tab === "pedidos"} onClick={() => cambiarTab("pedidos")}>
          Mis pedidos{contador(pedidos ? pedidos.length : null)}
        </button>
        <button className="tab" role="tab" aria-selected={tab === "solicitudes"} onClick={() => cambiarTab("solicitudes")}>
          Mis solicitudes{contador(solicitudes ? solicitudes.paginacion.total : null)}
        </button>
      </div>
      <section role="tabpanel">
        {tab === "datos" && (
          <div className="card">
            <div className="ch">
              <ShieldCheck size={18} strokeWidth={1.75} aria-hidden />
              Tus datos
            </div>
            <dl className="dg">
              <div>
                <dt>Nombre</dt>
                <dd>{user.name}</dd>
              </div>
              <div>
                <dt>Correo</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Rol</dt>
                <dd>{ROL_LABEL[user.id_role] ?? "Usuario"}</dd>
              </div>
            </dl>
            {tieneErp && (
              <div className="kv">
                <dt>ERP</dt>
                <dd>
                  <a className="lnk" href="/erp/">
                    <LayoutDashboard size={16} strokeWidth={1.75} aria-hidden />
                    {esMaestra ? "Abrir ERP de administración" : "Abrir mi panel de vendedor"}
                  </a>
                </dd>
              </div>
            )}
          </div>
        )}
        {tab === "pedidos" && (
          <PedidosTab
            pedidos={pedidos}
            error={errorPedidos}
            onRetry={cargarPedidos}
          />
        )}
        {tab === "solicitudes" && (
          <SolicitudesTab
            resp={solicitudes}
            error={errorSolicitudes}
            pagina={paginaSol}
            onPagina={setPaginaSol}
            onRetry={() => cargarSolicitudes(paginaSol)}
          />
        )}
      </section>
    </>
  )
}

export default MiCuentaPanel
