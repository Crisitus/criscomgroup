import { useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchProducts } from "../../services/productService"
import { fetchCategories } from "../../services/categoryService"
import { commercialApi } from "../../services/commercialService"
import { buildRow, r2, type OfeRow } from "./ofeCalc"

interface DashProd { id_producto: number; costo_promedio: string | number | null }
export interface Cat { id_categoria: number; nombre: string }

export function useOfeData() {
  const qc = useQueryClient()
  const pq = useQuery({ queryKey: ["products"], queryFn: fetchProducts })
  const cq = useQuery({ queryKey: ["categories"], queryFn: fetchCategories })
  const dq = useQuery({ queryKey: ["commercial-inventory-dashboard"], queryFn: commercialApi.dashboard })

  const rows = useMemo<OfeRow[]>(() => {
    const dash = dq.data as { products?: DashProd[] } | undefined
    const cost = new Map((dash?.products || []).map(x => [x.id_producto, Number(x.costo_promedio) || 0]))
    return (pq.data || []).map(p => buildRow(p, dq.isError || !dash ? null : (cost.get(p.id_producto) ?? 0)))
  }, [pq.data, dq.data, dq.isError])

  const kpi = useMemo(() => {
    const on = rows.filter(r => r.offer !== null && r.pct !== null)
    const avg = on.length ? on.reduce((a, r) => a + (r.pct || 0), 0) / on.length : null
    return {
      total: rows.length, on: rows.filter(r => r.offer !== null).length,
      avg: avg === null ? null : Math.round(avg * 10) / 10,
      max: on.length ? r2(Math.max(...on.map(r => r.pct || 0))) : null,
    }
  }, [rows])

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["offers"] })
    void qc.invalidateQueries({ queryKey: ["products"] })
    void qc.invalidateQueries({ queryKey: ["commercial-inventory-dashboard"] })
  }
  const retry = () => { void pq.refetch(); void dq.refetch(); void cq.refetch() }
  return {
    rows, kpi, cats: (cq.data || []) as Cat[], refresh, retry,
    loading: pq.isLoading, error: pq.isError, costFail: dq.isError,
    errMsg: (pq.error as { message?: string } | null)?.message || "",
  }
}
