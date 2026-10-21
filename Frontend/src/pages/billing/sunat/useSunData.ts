import { useCallback, useEffect, useState } from "react"
import { apiFailure, fetchIntegrations, type IntegrationStatus } from "../../../services/companyService"
import { fetchEmisores, type EmisoresRespuesta } from "../../../services/facturacionService"
import type { Status } from "./sunCommon"

export type Block<T> = { status: Status; data: T | null; message: string }

const toStatus = (code: number | null): Status => (code === 403 ? "403" : code === null ? "red" : "500")
const loading = { status: "loading" as Status, data: null, message: "" }

/** Conexión (integraciones) y emisores: cada bloque falla por separado y un fallo no borra al otro. */
export function useSunData() {
  const [conn, setConn] = useState<Block<IntegrationStatus["sunat"]>>(loading)
  const [emi, setEmi] = useState<Block<EmisoresRespuesta>>(loading)

  const loadConn = useCallback(async () => {
    try { setConn({ status: "ok", data: (await fetchIntegrations()).sunat, message: "" }) }
    catch (error) {
      const f = apiFailure(error, "No se pudo leer el estado de la conexión")
      setConn({ status: toStatus(f.status), data: null, message: f.message })
    }
  }, [])
  const loadEmi = useCallback(async () => {
    try {
      const data = await fetchEmisores()
      setEmi({ status: data.emisores.length ? "ok" : "vacio", data, message: "" })
    } catch (error) {
      const f = apiFailure(error, "No se pudo cargar la configuración fiscal")
      setEmi({ status: toStatus(f.status), data: null, message: f.message })
    }
  }, [])
  const reload = useCallback(async () => { await Promise.all([loadConn(), loadEmi()]) }, [loadConn, loadEmi])
  useEffect(() => { void reload() }, [reload])
  const retryEmi = () => { setEmi(loading); return loadEmi() }
  const retryConn = () => { setConn(loading); return loadConn() }
  return { conn, emi, reload, loadEmi, retryEmi, retryConn }
}
