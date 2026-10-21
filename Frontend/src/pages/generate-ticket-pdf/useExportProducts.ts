import { useCallback, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchProducts, type Product } from "../../services/productService"
import { categoriasDe, filtrarProductos, type FiltrosBase, type FiltrosExcel, type FiltrosTicket } from "./productFilters"
import { contarInvalidos, mensajeError, productoValido } from "./productData"

/** Listado de productos (mismo GET /productos que el resto del ERP) siempre fresco al abrir la pantalla. */
export const useExportProducts = () => {
  const q = useQuery({ queryKey: ["products"], queryFn: fetchProducts, refetchOnMount: "always" })
  const todos = useMemo(() => (Array.isArray(q.data) ? q.data : []), [q.data])
  const productos = useMemo(() => todos.filter(productoValido), [todos])
  return {
    productos,
    invalidos: contarInvalidos(todos),
    categorias: useMemo(() => categoriasDe(productos), [productos]),
    cargando: q.isLoading,
    error: q.isError ? mensajeError(q.error) : null,
    /** 403: reintentar no lo arregla (la pantalla no ofrece «Reintentar»). */
    sinPermiso: q.isError && (q.error as { response?: { status?: number } } | null)?.response?.status === 403,
    /** El listado solo trae costos para quien tiene permiso: sin las claves no hay costos que exportar. */
    puedeCostos: productos.some(p => "costo_promedio" in p || "ultimo_costo" in p),
    reintentar: () => { void q.refetch() },
    recargando: q.isFetching && !q.isLoading,
  }
}

/** Seleccion por ids. No se vuelve a marcar nada sola: solo cambia por acciones del usuario. */
export const useSeleccion = (inicial?: Iterable<number>) => {
  const [ids, setIds] = useState<Set<number>>(() => new Set(inicial))
  const alternar = useCallback((id: number) => setIds(prev => {
    const s = new Set(prev)
    if (s.has(id)) s.delete(id); else s.add(id)
    return s
  }), [])
  const agregar = useCallback((nuevos: Iterable<number>) => setIds(prev => new Set([...prev, ...nuevos])), [])
  const quitar = useCallback((fuera: Iterable<number>) => setIds(prev => {
    const s = new Set(prev)
    for (const id of fuera) s.delete(id)
    return s
  }), [])
  const reemplazar = useCallback((nuevos: Iterable<number>) => setIds(new Set(nuevos)), [])
  const limpiar = useCallback(() => setIds(new Set()), [])
  return { ids, alternar, agregar, quitar, reemplazar, limpiar }
}

/** Filtros + lista filtrada + conteos de lo seleccionado dentro y fuera del filtro. */
export const useListaFiltrada = <F extends FiltrosBase & Partial<FiltrosTicket> & Partial<FiltrosExcel>>(
  productos: Product[], inicial: F, seleccion: Set<number>,
) => {
  const [filtros, setFiltros] = useState<F>(inicial)
  const filtrados = useMemo(() => filtrarProductos(productos, filtros), [productos, filtros])
  const idsFiltrados = useMemo(() => new Set(filtrados.map(p => p.id_producto)), [filtrados])
  const seleccionadosEnFiltro = useMemo(() => filtrados.filter(p => seleccion.has(p.id_producto)), [filtrados, seleccion])
  const fueraDelFiltro = useMemo(() => [...seleccion].filter(id => !idsFiltrados.has(id)), [seleccion, idsFiltrados])
  const cambiar = useCallback(<K extends keyof F>(k: K, v: F[K]) => setFiltros(prev => ({ ...prev, [k]: v })), [])
  const limpiarFiltros = useCallback(() => setFiltros(inicial), [inicial])
  return { filtros, cambiar, limpiarFiltros, filtrados, seleccionadosEnFiltro, fueraDelFiltro }
}
