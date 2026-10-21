import { CheckCircle2, Clock, Lock, ShieldAlert, UserX } from "lucide-react"
import type { User } from "../../../services/userService"
import { Chip } from "./UsrParts"

/** Estado de la cuenta con icono + palabra; «Desactivada» prevalece sobre todo lo demás. */
export function UserChips({ u, lg }: { u: User; lg?: boolean }) {
  const prot = u.es_maestra ? <Chip key="p" t="nu" icon={Lock} x="Protegida" lg={lg} /> : null
  if (u.activo === false) return <>{prot}<Chip t="nu" icon={UserX} x="Desactivada" lg={lg} /></>
  if (u.id_role === 5) return <>{prot}<Chip t={u.acceso_vencido ? "er" : "ok"} icon={Clock} x={u.acceso_vencido ? "Acceso vencido" : "Acceso vigente"} lg={lg} /></>
  if (u.id_role === 2 && u.superusuario_vigente) return <>{prot}<Chip t="wn" icon={ShieldAlert} x="Elevada" lg={lg} /></>
  if (u.id_role === 2 && u.superusuario_temporal) return <>{prot}<Chip t="er" icon={ShieldAlert} x="Elevación vencida" lg={lg} /></>
  return <>{prot}<Chip t="ok" icon={CheckCircle2} x="Activa" lg={lg} /></>
}
