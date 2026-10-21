import { useQuery, useQueryClient } from "@tanstack/react-query"
import { loadCategories, loadCodes, loadFicha, loadMetrics, loadMovements } from "./api"

/** Lecturas de la ficha. Las claves ["product", id] y ["barcodes", id] son las mismas de la pantalla anterior. */
export function useFichaData(id: number) {
  const qc = useQueryClient()
  const product = useQuery({ queryKey: ["product", String(id)], queryFn: () => loadFicha(id), retry: false })
  const cats = useQuery({ queryKey: ["categories"], queryFn: loadCategories })
  const codes = useQuery({ queryKey: ["barcodes", String(id)], queryFn: () => loadCodes(id), enabled: product.isSuccess })
  const metrics = useQuery({ queryKey: ["ficha-metrics", id], queryFn: () => loadMetrics(id), enabled: product.isSuccess })
  const movs = useQuery({ queryKey: ["ficha-movs", id], queryFn: () => loadMovements(id), enabled: product.isSuccess })

  /** Vuelve a leer ficha y codigos (descarta cualquier cache) y devuelve lo leido. */
  const refetchCore = async () => {
    const [p, c] = await Promise.all([
      qc.fetchQuery({ queryKey: ["product", String(id)], queryFn: () => loadFicha(id), staleTime: 0 }),
      qc.fetchQuery({ queryKey: ["barcodes", String(id)], queryFn: () => loadCodes(id), staleTime: 0 }),
    ])
    return { product: p, codes: c }
  }
  const refreshSide = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["ficha-metrics", id] }),
      qc.invalidateQueries({ queryKey: ["ficha-movs", id] }),
      qc.invalidateQueries({ queryKey: ["products"] }),
    ])
  return { product, cats, codes, metrics, movs, refetchCore, refreshSide }
}
