import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { registrarExportacion } from "../../../services/exportService"
import { construirFilas, descargarBlob, generarExcel, nombreArchivoExcel, type OpcionesExcel } from "../excelExport"
import { FILTROS_EXCEL, filtrosParaAuditoria, type FiltrosExcel } from "../productFilters"
import { useExportProducts, useListaFiltrada, useSeleccion } from "../useExportProducts"
import { contadoresChips, hayFiltrosActivos, motivoDescarga, resumenAvisos, vistaPrevia, type Fase, type Resultado } from "./expLogic"

export type Columnas = { sku: boolean; categoria: boolean; precio: boolean; costos: boolean }
const SIN_COLUMNAS: Columnas = { sku: false, categoria: false, precio: false, costos: false }

/** Estado y acciones de «Exportar productos». La pantalla solo pinta lo que devuelve. */
export function useExpPage() {
  const datos = useExportProducts()
  const sel = useSeleccion()
  const lista = useListaFiltrada<FiltrosExcel>(datos.productos, FILTROS_EXCEL, sel.ids)
  const [cols, setCols] = useState<Columnas>(SIN_COLUMNAS)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [busy, setBusy] = useState(false)
  const [ahora, setAhora] = useState(() => new Date())

  // Se marca todo lo visible UNA sola vez al cargar; despues manda el usuario.
  const inicializado = useRef(false)
  const { reemplazar } = sel
  const { filtrados } = lista
  useEffect(() => {
    if (inicializado.current || datos.productos.length === 0) return
    inicializado.current = true
    reemplazar(filtrados.map(p => p.id_producto))
  }, [datos.productos.length, filtrados, reemplazar])

  // El nombre del archivo lleva la hora (HHMM): se refresca para que la vista previa no mienta.
  useEffect(() => {
    const t = window.setInterval(() => setAhora(new Date()), 20000)
    return () => window.clearInterval(t)
  }, [])

  const fase: Fase = datos.cargando ? "loading" : datos.error ? (datos.sinPermiso ? "403" : "error") : datos.productos.length === 0 ? "vacio" : "ok"
  const f = lista.filtros
  const aExportar = lista.seleccionadosEnFiltro
  const costos = datos.puedeCostos && cols.costos
  const opciones: OpcionesExcel = useMemo(() => ({ sku: cols.sku, categoria: cols.categoria, precio: cols.precio, costos }), [cols, costos])
  const avisos = useMemo(() => resumenAvisos(aExportar), [aExportar])
  const vista = useMemo(() => vistaPrevia(aExportar, opciones), [aExportar, opciones])
  const motivo = motivoDescarga(fase, aExportar.length, sel.ids.size)
  const nombre = nombreArchivoExcel(f.soloModificados, f.soloConStock, ahora)
  const idsFiltrados = useMemo(() => filtrados.map(p => p.id_producto), [filtrados])

  const suelta = useCallback(() => setResultado(null), [])
  const cambiar: typeof lista.cambiar = (k, v) => { suelta(); lista.cambiar(k, v) }
  const cambiarColumna = (k: keyof Columnas, v: boolean) => { suelta(); setCols(c => ({ ...c, [k]: v })) }
  const alternar = (id: number) => { suelta(); sel.alternar(id) }
  const marcarTodos = () => { suelta(); sel.agregar(idsFiltrados) }
  const marcarLista = (marcar: boolean) => { suelta(); if (marcar) sel.agregar(idsFiltrados); else sel.quitar(idsFiltrados) }
  const deseleccionar = () => { suelta(); sel.limpiar() }
  const limpiarFiltros = () => { suelta(); lista.limpiarFiltros() }

  const descargar = async () => {
    if (busy || motivo) return
    setBusy(true)
    setResultado(null)
    const archivo = nombreArchivoExcel(f.soloModificados, f.soloConStock)
    const base = { nombre: archivo, cantidad: aExportar.length, sinCodigo: avisos.sinCodigo.length, cuando: new Date() }
    try {
      descargarBlob(await generarExcel(construirFilas(aExportar, opciones), opciones), archivo)
    } catch (error) {
      console.error("Error generando Excel:", error)
      setResultado({ ...base, tipo: "gen" })
      setBusy(false)
      return
    }
    let tipo: Resultado["tipo"] = "ok"
    try {
      await registrarExportacion({ tipo: "productos_excel", cantidad: base.cantidad, filtros: { ...filtrosParaAuditoria(f), sinCodigoBarras: base.sinCodigo } })
    } catch {
      tipo = "aud"
    }
    setResultado({ ...base, tipo })
    setBusy(false)
  }

  return {
    datos, fase, f, filtrados, aExportar, avisos, vista, motivo, nombre, opciones, cols, costos, busy, resultado,
    seleccion: sel.ids, fuera: lista.fueraDelFiltro.length, cnt: contadoresChips(datos.productos, f.soloConStock),
    sucio: hayFiltrosActivos(f), puedeCostos: datos.puedeCostos,
    cambiar, cambiarColumna, alternar, marcarTodos, marcarLista, deseleccionar, limpiarFiltros, descargar,
  }
}
export type ExpPage = ReturnType<typeof useExpPage>
