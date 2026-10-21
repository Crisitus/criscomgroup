export type EmpTabKey = "company" | "hours" | "sunat" | "payments" | "users"

export interface EmpTabDef { key: EmpTabKey; label: string; enabled: boolean; reason: string }

export interface EmpPerms { manager: boolean; sunat: boolean; payments: boolean; users: boolean }

/** Las cuatro pestanas siempre; las que el rol no puede usar quedan deshabilitadas con su motivo. "Usuarios y roles" solo para la cuenta que ya la veia. */
export function buildTabs(p: EmpPerms): EmpTabDef[] {
  const tabs: EmpTabDef[] = [
    { key: "company", label: "Empresa", enabled: p.manager, reason: "Solo Gerencia (rol 1) puede ver y editar los datos de la empresa." },
    { key: "hours", label: "Horario", enabled: p.manager, reason: "Solo Gerencia (rol 1) puede cambiar el horario laboral." },
    { key: "sunat", label: "SUNAT", enabled: p.sunat, reason: "Requiere Gerencia, Administración o el permiso de área «empresa_sunat»." },
    { key: "payments", label: "Pagos y POS", enabled: p.payments, reason: "Requiere Gerencia o el permiso de área «pagos_pos»." },
  ]
  if (p.users) tabs.push({ key: "users", label: "Usuarios y roles", enabled: true, reason: "" })
  return tabs
}

export const TAB_FROM_URL: Record<string, EmpTabKey> = { company: "company", hours: "hours", sunat: "sunat", payments: "payments", users: "users" }

/** Pestana que se muestra: la pedida si esta permitida, si no la primera permitida (o ninguna). */
export function pickTab(tabs: EmpTabDef[], requested: string | null): EmpTabKey | null {
  const want = requested ? TAB_FROM_URL[requested] : undefined
  const ok = tabs.filter(t => t.enabled)
  return (want && ok.find(t => t.key === want)?.key) || ok[0]?.key || null
}
