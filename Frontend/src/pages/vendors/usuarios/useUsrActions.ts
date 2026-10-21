import { useCallback, useState } from "react"
import { fieldErrors, httpStatus, serverMsg } from "./usrCommon"
import type { Banner } from "./UsrParts"

export type RunResult<T> = { ok: true; data: T } | { ok: false; error: unknown }

/** Ejecuta una acción de escritura y traduce la respuesta: 403 con el motivo del servidor, 401, 409/422 por campo, 500. */
export function useUsrActions() {
  const [busy, setBusy] = useState("")
  const [banner, setBanner] = useState<Banner | null>(null)
  const [errs, setErrs] = useState<Record<string, string>>({})

  const clear = useCallback(() => { setBanner(null); setErrs({}) }, [])

  const run = useCallback(async <T,>(key: string, fn: () => Promise<T>, ok?: { title: string; text?: string }): Promise<RunResult<T>> => {
    setBusy(key); setBanner(null); setErrs({})
    try {
      const data = await fn()
      if (ok) setBanner({ tone: "ok", ...ok })
      return { ok: true, data }
    } catch (error) {
      const code = httpStatus(error)
      const msg = serverMsg(error)
      setErrs(fieldErrors(error))
      if (code === 403) setBanner({ tone: "wn", title: "El servidor rechazó la acción (403)", text: `«${msg}»` })
      else if (code === 401) setBanner({ tone: "er", title: "Tu sesión terminó", text: "Vuelve a iniciar sesión para continuar." })
      else if (code >= 500 || code === 0) setBanner({ tone: "er", title: "No se pudo completar la acción", text: code === 0 ? "No hay conexión con el servidor. Intenta de nuevo." : msg })
      else setBanner({ tone: "er", title: msg })
      return { ok: false, error }
    } finally { setBusy("") }
  }, [])

  return { busy, banner, errs, run, clear, setBanner }
}
export type Actions = ReturnType<typeof useUsrActions>
