import { useCallback, useEffect, useState } from "react"
import { apiFailure } from "../../../services/companyService"
import { fetchDocumentos, type DocumentoSunat, type EstadoDocumento } from "../../../services/facturacionService"
import type { Status } from "./sunCommon"

export const PAGE_SIZE = 8

export function useSunDocs() {
  const [estado, setEstado] = useState<EstadoDocumento | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<DocumentoSunat[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<Status>("loading")
  const [message, setMessage] = useState("")
  const [open, setOpen] = useState<number | null>(null)

  const load = useCallback(async (p: number, e: EstadoDocumento | undefined) => {
    try {
      const r = await fetchDocumentos(PAGE_SIZE, (p - 1) * PAGE_SIZE, e)
      setRows(r.items); setTotal(r.total); setStatus("ok"); setMessage("")
    } catch (error) {
      const f = apiFailure(error, "No se pudieron cargar los documentos")
      setRows([]); setMessage(f.message); setStatus(f.status === 403 ? "403" : f.status === null ? "red" : "500")
    }
  }, [])
  useEffect(() => { void load(page, estado) }, [load, page, estado])

  const pickEstado = (e: EstadoDocumento | undefined) => { setEstado(e); setPage(1); setOpen(null); setStatus("loading") }
  const goPage = (p: number) => { setOpen(null); setPage(p) }
  const reload = () => { setStatus("loading"); return load(page, estado) }
  return { estado, page, rows, total, status, message, open, setOpen, pickEstado, goPage, reload }
}
