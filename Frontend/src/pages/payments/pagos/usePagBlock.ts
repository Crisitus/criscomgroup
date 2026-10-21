import { useCallback, useEffect, useRef, useState } from "react"
import { apiFailure } from "../../../services/companyService"

export type BlockStatus = "load" | "ok" | "error" | "forbidden" | "unauth"
export interface BlockState<T> { status: BlockStatus; data: T | null; message: string; code: number | null }

/** Un bloque de la pantalla falla por separado: error, 403 y 401 son distintos del vacío. */
export function useBlock<T>(fetcher: () => Promise<T>, enabled = true) {
  const [state, setState] = useState<BlockState<T>>({ status: enabled ? "load" : "ok", data: null, message: "", code: null })
  const fn = useRef(fetcher)
  fn.current = fetcher
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  const load = useCallback(async (silent = false) => {
    if (!silent) setState(s => ({ ...s, status: "load", message: "", code: null }))
    try {
      const data = await fn.current()
      if (alive.current) setState({ status: "ok", data, message: "", code: null })
    } catch (error: unknown) {
      if (!alive.current) return
      const f = apiFailure(error, "No se pudo cargar")
      const status: BlockStatus = f.status === 403 ? "forbidden" : f.status === 401 ? "unauth" : "error"
      setState(s => ({ status, data: silent && status === "error" ? s.data : null, message: f.message, code: f.status }))
    }
  }, [])

  useEffect(() => { if (enabled) void load() }, [enabled, load])
  return { ...state, reload: () => load(true), retry: () => load(false) }
}
