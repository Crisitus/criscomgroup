import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { apiErrorMessage } from "../../../services/userService"
import { fetchAccessRequests, type AccessRequest, type MyAccess, fetchMyAccess, resolveAccessRequest, sendAccessRequest } from "../../../services/accessService"

/** Solicitudes de acceso: mis permisos, pedir un area y (maestra) aprobar/rechazar. */
export function useMaeAccess(exact: boolean) {
  const [my, setMy] = useState<MyAccess>({ areas: [], grants: [], requests: [] })
  const [all, setAll] = useState<AccessRequest[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [days, setDays] = useState<Record<number, string>>({})

  const load = useCallback(async () => {
    try {
      setMy(await fetchMyAccess())
      if (exact) setAll(await fetchAccessRequests())
      setLoadError(null)
    } catch (e) { setLoadError(apiErrorMessage(e, "No se pudieron cargar los accesos")) }
  }, [exact])
  useEffect(() => { void load() }, [load])

  const act = async (run: () => Promise<unknown>, ok: string) => {
    try { await run(); toast.success(ok); void load() } catch (e) { toast.error(apiErrorMessage(e)) }
  }
  const request = (area: string, reason: string, done: () => void) =>
    act(async () => { await sendAccessRequest(area, reason); done() }, "Solicitud enviada a la cuenta maestra")
  // Vigencia por solicitud: el servidor exige una fecha futura de maximo 30 dias.
  const resolve = (id: number, status: "approved" | "rejected") =>
    act(() => resolveAccessRequest(id, status, status === "approved" ? new Date(Date.now() + Number(days[id] || "7") * 86400000).toISOString() : null),
      status === "approved" ? "Solicitud aprobada" : "Solicitud rechazada")
  return { my, pending: all.filter(r => r.status === "pending"), loadError, days, setDays, load, request, resolve }
}
