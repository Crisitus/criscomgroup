import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { SolScreen } from "./solicitudes/SolScreen"
import "../../styles/sol-acceso.css"

/** Entrada fina: Solicitudes de acceso. Los permisos concedidos se revocan en Cuenta maestra. */
export default function AccessCenterPage() {
  useDocumentTitle("Solicitudes de acceso")
  return (
    <div className="pg-solacc">
      <SolScreen />
    </div>
  )
}
