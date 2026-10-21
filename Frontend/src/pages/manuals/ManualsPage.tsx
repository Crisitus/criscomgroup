import { useAuth } from "../../contexts/AuthContext"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { ManualDenied } from "./ManualDenied"
import { ManualScreen } from "./ManualScreen"
import { pickProfile } from "./manualProfile"
import "../../styles/manuals.css"

/** Entrada fina: Manual de mi perfil (contenido estático, sin llamadas al backend). */
export default function ManualsPage() {
  useDocumentTitle("Manual de mi perfil")
  const { user } = useAuth()
  return (
    <div className="pg-manuals">
      {user?.id_role === 4 ? <ManualDenied /> : <ManualScreen k={pickProfile(user)} />}
    </div>
  )
}
