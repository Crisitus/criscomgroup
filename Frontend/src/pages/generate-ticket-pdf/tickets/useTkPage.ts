import { useCallback, useEffect, useMemo, useState } from "react"
import { registrarExportacion } from "../../../services/exportService"
import { sinCodigoBarras } from "../productData"
import { FILTROS_TICKET, filtrosParaAuditoria, type FiltrosTicket } from "../productFilters"
import { useExportProducts, useListaFiltrada, useSeleccion } from "../useExportProducts"
import { CONFIG_TICKET, MAX_TICKETS, type TicketConfig } from "./ticketConfig"
import { descargarPdfTickets, expandirCopias, generarPdfTickets, nombreArchivoTickets } from "./ticketPdf"
import { hojasDe, hayFiltrosActivos, motivoAccion, type Fase, type GenPdf, type ResultadoPdf } from "./tkLogic"

export const POR_PAGINA = 25

/** Estado y acciones de «Tickets PDF». La pantalla solo pinta lo que devuelve. */
export function useTkPage() {
  const datos = useExportProducts()
  const sel = useSeleccion()
  const lista = useListaFiltrada<FiltrosTicket>(datos.productos, FILTROS_TICKET, sel.ids)
  const [config, setConfig] = useState<TicketConfig>(CONFIG_TICKET)
  const [pagina, setPagina] = useState(1)
  const [gen, setGen] = useState<GenPdf>("")
  const [resultado, setResultado] = useState<ResultadoPdf | null>(null)
  const [vista, setVista] = useState<{ url: string; blob: Blob } | null>(null)

  const totalPaginas = Math.max(1, Math.ceil(lista.filtrados.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const enPagina = useMemo(
    () => lista.filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
    [lista.filtrados, paginaActual])
  // Lo que se imprime: todo lo seleccionado (visible o no), en el orden del catalogo.
  const seleccionados = useMemo(() => datos.productos.filter(p => sel.ids.has(p.id_producto)), [datos.productos, sel.ids])
  const n = seleccionados.length
  const etiquetas = n * config.copias
  const hojas = hojasDe(etiquetas)
  const excede = etiquetas > MAX_TICKETS
  const sinCodigo = useMemo(() => seleccionados.filter(sinCodigoBarras).length, [seleccionados])
  const items = useMemo(() => expandirCopias(seleccionados, config.copias), [seleccionados, config.copias])
  const fase: Fase = datos.cargando ? "loading" : datos.error ? (datos.sinPermiso ? "403" : "error") : datos.productos.length === 0 ? "vacio" : "ok"
  const motivo = motivoAccion(fase, n, etiquetas)

  const suelta = useCallback(() => { setGen(""); setResultado(null) }, [])
  const cambiar = useCallback(<K extends keyof FiltrosTicket>(k: K, v: FiltrosTicket[K]) => {
    suelta(); lista.cambiar(k, v); setPagina(1)
  }, [lista, suelta])
  const limpiarFiltros = useCallback(() => { suelta(); lista.limpiarFiltros(); setPagina(1) }, [lista, suelta])
  const cambiarConfig = useCallback((c: Partial<TicketConfig>) => { suelta(); setConfig(prev => ({ ...prev, ...c })) }, [suelta])
  const alternar = (id: number) => { suelta(); sel.alternar(id) }
  const marcarTodos = () => { suelta(); sel.agregar(lista.filtrados.map(p => p.id_producto)) }
  const marcarPagina = (marcar: boolean) => { suelta(); const ids = enPagina.map(p => p.id_producto); if (marcar) sel.agregar(ids); else sel.quitar(ids) }
  const deseleccionar = () => { suelta(); sel.limpiar() }
  const quitarFuera = () => { suelta(); sel.quitar(lista.fueraDelFiltro) }

  const cerrarVista = useCallback(() => setVista(v => { if (v) URL.revokeObjectURL(v.url); return null }), [])
  useEffect(() => () => { if (vista) URL.revokeObjectURL(vista.url) }, [vista])

  /** Audita una descarga ya hecha; si el registro falla se avisa (el PDF ya esta guardado). */
  const auditar = async (cantidad: number, nombre: string) => {
    const base = { nombre, etiquetas: cantidad, hojas: hojasDe(cantidad) }
    try {
      await registrarExportacion({
        tipo: "tickets_pdf", cantidad,
        filtros: { ...filtrosParaAuditoria(lista.filtros), copias: config.copias, sinCodigoBarras: sinCodigo },
      })
      setResultado({ ...base, tipo: "ok" })
    } catch {
      setResultado({ ...base, tipo: "aud" })
    }
  }

  const ejecutar = async (modo: "vista" | "descarga") => {
    if (motivo || gen === "gen") return
    setGen("gen")
    setResultado(null)
    try {
      const blob = await generarPdfTickets(seleccionados, config)
      if (modo === "vista") {
        setVista(v => { if (v) URL.revokeObjectURL(v.url); return { url: URL.createObjectURL(blob), blob } })
      } else {
        descargarPdfTickets(blob)
        await auditar(etiquetas, nombreArchivoTickets())
      }
      setGen("")
    } catch (error) {
      console.error("Error al generar el PDF de tickets:", error)
      setGen("generr")
    }
  }

  /** Desde la vista previa: descarga el MISMO blob ya generado (no regenera) y audita. */
  const descargarDesdeVista = async () => {
    if (!vista || gen === "gen") return
    setGen("gen")
    setResultado(null)
    try {
      descargarPdfTickets(vista.blob)
      cerrarVista()
      await auditar(etiquetas, nombreArchivoTickets())
      setGen("")
    } catch (error) {
      console.error("Error al descargar el PDF de tickets:", error)
      setGen("generr")
    }
  }

  return {
    datos, fase, f: lista.filtros, filtrados: lista.filtrados, enPagina, seleccionados, seleccion: sel.ids,
    fuera: lista.fueraDelFiltro, config, gen, resultado, vista, motivo, excede,
    n, etiquetas, hojas, sinCodigo, items, paginaActual, totalPaginas,
    sucio: hayFiltrosActivos(lista.filtros),
    cambiar, limpiarFiltros, cambiarConfig, alternar, marcarTodos, marcarPagina, deseleccionar, quitarFuera,
    setPagina, ejecutar, descargarDesdeVista, cerrarVista,
  }
}

export type TkPage = ReturnType<typeof useTkPage>
