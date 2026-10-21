import { useCallback, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { deleteBannerCarrusel, getApiErrorMessage, getBanners, reorderBanners, setBannerActivo, type Banner } from "../../../services/marketingService"
import { isRow, type Row } from "./bannerShared"

const KEY = ["banners"]

export function useBanners() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: KEY, queryFn: getBanners })
  const banners: Row[] = useMemo(() => (q.data || []).filter(isRow), [q.data])
  const [busy, setBusy] = useState<number[]>([])
  const [reordering, setReordering] = useState(false)

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: KEY }), [qc])

  const toggle = async (b: Row) => {
    const next = b.activo === false
    setBusy(c => [...c, b.id_banner])
    try {
      await setBannerActivo(b.id_banner, next)
      await refresh()
      toast.success(next ? "Banner publicado en la web" : "Banner oculto de la web")
    } catch (e) { toast.error(getApiErrorMessage(e, "No se pudo cambiar el estado del banner")) }
    finally { setBusy(c => c.filter(x => x !== b.id_banner)) }
  }

  /** Una sola llamada a /banners/reordenar con la posición final de todos (1..n). */
  const reorder = async (ids: number[]) => {
    const prev = qc.getQueryData<Banner[]>(KEY) || []
    const orden = ids.map((id, i) => ({ id, orden: i + 1 }))
    qc.setQueryData<Banner[]>(KEY, ids.map((id, i) => ({ ...prev.find(b => b.id_banner === id)!, orden: i + 1 })))
    setReordering(true)
    try {
      await reorderBanners(orden)
      await refresh()
      toast.success("Orden del carrusel guardado")
    } catch (e) {
      qc.setQueryData(KEY, prev)
      toast.error(getApiErrorMessage(e, "No se pudo guardar el orden"))
    } finally { setReordering(false) }
  }

  const del = useMutation({
    mutationFn: (id: number) => deleteBannerCarrusel(id),
    onSuccess: () => { void refresh(); toast.success("Banner eliminado exitosamente") },
  })

  return {
    banners, loading: q.isLoading, error: q.isError, refetch: () => void q.refetch(), refresh,
    busy, reordering, toggle, reorder, del,
  }
}
export type BannersApi = ReturnType<typeof useBanners>
