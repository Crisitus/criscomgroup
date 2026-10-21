import "../../styles/usuarios.css"
import { UsrAffiliates } from "./usuarios/UsrAffiliates"
import { useUsrAffiliates } from "./usuarios/useUsrAffiliates"
import { useAuth } from "../../contexts/AuthContext"

/** Entrada fina del panel de afiliados (la pantalla principal lo integra como pestaña «Afiliados»). */
export default function AffiliateAdminPanel() {
  const { user } = useAuth()
  const aff = useUsrAffiliates()
  return <div className="pg-usuarios"><UsrAffiliates a={aff} actor={{ maestra: !!user?.es_maestra, id: Number(user?.id ?? 0) }} focus={null} /></div>
}
