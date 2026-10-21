import { useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchProducts } from "../../../services/productService"
import { fetchCategories } from "../../../services/categoryService"
import { commercialApi } from "../../../services/commercialService"
import { buildRow, type Cat, type Dash, type Prod, type Row, type Summary } from "./prodShared"

export function useProdData() {
  const qc = useQueryClient()
  const pq = useQuery({ queryKey: ["products"], queryFn: fetchProducts })
  const dq = useQuery({ queryKey: ["commercial-inventory-dashboard"], queryFn: commercialApi.dashboard })
  const cq = useQuery({ queryKey: ["categories"], queryFn: fetchCategories })

  const rows = useMemo<Row[]>(() => {
    const dash = dq.data as Dash | undefined
    const m = new Map((dash?.products || []).map(x => [x.id_producto, x]))
    return ((pq.data || []) as unknown as Prod[]).map(p => buildRow(p, m.get(p.id_producto)))
  }, [pq.data, dq.data])

  const summary = useMemo<Summary>(() => {
    const d = dq.data as Dash | undefined
    if (d?.summary) return d.summary
    return {
      productos: rows.length, unidades: rows.reduce((s, r) => s + r.p.stock, 0),
      valor_stock: Math.round(rows.reduce((s, r) => s + r.valor, 0) * 100) / 100,
      bajo_minimo: rows.filter(r => r.bajo).length, sin_costo: rows.filter(r => !r.ck && r.p.stock > 0).length,
    }
  }, [dq.data, rows])

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["products"] })
    void qc.invalidateQueries({ queryKey: ["commercial-inventory-dashboard"] })
    void qc.invalidateQueries({ queryKey: ["inventory-locations"] })
  }
  const retry = () => { void pq.refetch(); void dq.refetch() }
  return {
    rows, summary, cats: (cq.data || []) as Cat[], refresh, retry,
    loading: pq.isLoading, error: pq.isError, metricsFailed: dq.isError,
  }
}
