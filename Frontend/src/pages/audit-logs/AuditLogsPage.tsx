import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import AudScreen from "./AudScreen"
import "../../styles/auditoria.css"

/** Entrada fina: Logs de auditoria (el acceso por rol lo define App.tsx y el permiso real el backend). */
export default function AuditLogsPage() {
  useDocumentTitle("Logs de auditoría")
  return <AudScreen />
}
