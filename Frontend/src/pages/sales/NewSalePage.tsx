"use client"

import { useState, useEffect, useRef, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, Minus, Trash2, Loader2, Search, Barcode, AlertTriangle, X, Receipt, CreditCard, Package, PauseCircle, RefreshCw, QrCode, Keyboard, Clock, Percent, User, Banknote, Landmark, Link2, Bookmark, FilePlus, RotateCcw, ChevronLeft, StickyNote, CircleAlert, CircleCheck, Pencil, ScanLine, Building2, type LucideIcon } from 'lucide-react'

// UI Components

// Services
import { fetchProducts } from "../../services/productService"
import { createSale, generateSaleTicket, emitElectronicDocument } from "../../services/saleService"
import { fetchCompanyForSales } from "../../services/companyService"
import { buscarProductoPorCodigoBarras, obtenerCodigosBarras } from "../../services/codigoBarrasService"
import { CameraCodeScanner } from "../../components/scanner/CameraCodeScanner"
import {
  convertHtmlToPdf,
  consultarRuc,
  consultarDni,
  type ClienteConsultaResponse,
} from "../../services/invoiceService"
import { API_URL } from "../../config/api"

// Hooks and Contexts
import { useAuth } from "../../contexts/AuthContext"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import TicketViewer from "../../components/ticket-viewer"

// Utils
import { formatCurrency } from "../../lib/utils"
import { setupThermalPrinterAutoDetection, configureThermalPrinterSettings } from "../../utils/openDocument"
import moment from "moment-timezone"
import { listAdquirentesPos } from "../../services/posService"

// Modales
import {
  ClienteDialog,
  BarcodeScannerDialog,
  ShortcutsDialog,
  SunatAlertDialog,
  InvoiceDialog,
  SaleSuccessDialog,
  CartNamingDialog,
  DiscountDialog,
  SavedCartsDialog,
  BarcodeSelectionDialog,
} from "../../utils/salesDialogs"
import { Dialog, DialogContent } from "../../components/ui/dialog"
import "../../styles/pos.css"
import { dateTimeLima } from "../../components/erp/format"
const I = (Icon: LucideIcon, size = 16) => <Icon size={size} strokeWidth={1.75} aria-hidden="true" />

// Interfaces TypeScript optimizadas
interface CartItem {
  producto_id: number
  nombre: string
  precio_unitario: string
  precio_unitario_con_igv: string
  precio_mayoritario?: string | null
  precio_mayoritario_con_igv?: string | null
  precio_oferta?: string | null
  precio_oferta_con_igv?: string | null
  es_oferta?: boolean
  cantidad: number
  subtotal: number
  codigos_barras: string[]
  codigosMaximos?: Record<string, number>
  esPrecioMayorista: boolean
  esPrecioVariable?: boolean
  precioVariable?: string
  precioVariableConIgv?: string
  // Precios originales para restaurar cuando se desactive precio variable
  precioOriginal?: string
  precioOriginalConIgv?: string
  imagen_url?: string // Para mostrar la imagen en el carrito
}

interface SavedCart {
  id: string
  name: string
  items: CartItem[]
  metodoPago: string
  observaciones: string
  timestamp: number
  barcodeSearchResults: any[]
  tipoDocumento?: string
  clienteData?: ClienteConsultaResponse | null
}

export interface SaleItem {
  codigo_barras: string
  cantidad: number
  es_mayorista?: boolean
}

interface DocumentosSeries {
  facturaActual: number
  boletaActual: number
}

interface SaleFormData {
  id_cajero: number
  metodo_pago: string
  observaciones: string | null
  fecha?: string
  items: {
    codigo_barras: string
    cantidad: number
    es_mayorista?: boolean
    precio_personalizado?: string
    precio_personalizado_con_igv?: string
  }[]
  comprobante?: {
    tipo_documento: string
    cliente_tipo_documento: string
    cliente_numero_documento: string
    cliente_nombre: string
    cliente_direccion?: string
  }
  yape_celular?: string
  yape_codigo?: string
  plin_celular?: string
  plin_codigo?: string
  es_descuento?: boolean
  descuento?: number
  pos_pago?: { id_adquirente: number; canal?: 'pos' | 'qr' | 'link'; numero_operacion: string; ultimos_cuatro?: string; marca_tarjeta?: string }
  idempotency_key?: string
}

// Componente principal modernizado
const NewSalePage = () => {
  useDocumentTitle("Nueva Venta")
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  // Estados principales del carrito y venta
  const [cart, setCart] = useState<CartItem[]>([])
  const [viewportW, setViewportW] = useState(() => window.innerWidth)
  const [cobroOpen, setCobroOpen] = useState(false)
  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])
  useEffect(() => { if (cart.length === 0) setCobroOpen(false) }, [cart.length])
  const [metodoPago, setMetodoPago] = useState("efectivo")
  const [observaciones, setObservaciones] = useState("")  // Estados para facturación electrónica
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false)
  const [isInvoiceSending, setIsInvoiceSending] = useState(false)
  const [invoiceResult, setInvoiceResult] = useState<any>(null)
  const [currentSale, setCurrentSale] = useState<any>(null)
  const [showSunatAlert, setShowSunatAlert] = useState(false)
  const [showSaleSuccessDialog, setShowSaleSuccessDialog] = useState(false)

  // Estados para códigos de barras
  const [isBarcodeDialogOpen, setIsBarcodeDialogOpen] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState("")
  const [barcodeSearchResults, setBarcodeSearchResults] = useState<any[]>([])
  const [barcodeSearchResult, setBarcodeSearchResult] = useState<any>(null)
  const [isBarcodeSearching, setIsBarcodeSearching] = useState(false)
  const [isProcessingBarcode, setIsProcessingBarcode] = useState(false)
  const [isBarcodeScannerActive, setIsBarcodeScannerActive] = useState(true)
  const [scannedBarcode, setScannedBarcode] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [lastScanTime, setLastScanTime] = useState(0)

  // Estados para carritos guardados
  const [savedCarts, setSavedCarts] = useState<SavedCart[]>(() => {
    const saved = localStorage.getItem("erpComputacionSavedCarts")
    return saved ? JSON.parse(saved) : []
  })
  const [isSavedCartsDialogOpen, setIsSavedCartsDialogOpen] = useState(false)
  const [newCartName, setNewCartName] = useState("")
  const [isNamingCartDialogOpen, setIsNamingCartDialogOpen] = useState(false)
  const [needsStockRefresh, setNeedsStockRefresh] = useState(false)

  // Estados para documentos y cliente
  const [tipoDocumento, setTipoDocumento] = useState<string>("")
  const [isClienteDialogOpen, setIsClienteDialogOpen] = useState(false)
  const [documentoCliente, setDocumentoCliente] = useState("")
  const [isConsultandoCliente, setIsConsultandoCliente] = useState(false)
  const [clienteData, setClienteData] = useState<ClienteConsultaResponse | null>(null)

  // Estados para métodos de pago digitales
  const [yapeCelular, setYapeCelular] = useState<string>("")
  const [yapeCodigo, setYapeCodigo] = useState<string>("")
  const [plinCelular, setPlinCelular] = useState<string>("")
  const [plinCodigo, setPlinCodigo] = useState<string>("")
  const [montoRecibido, setMontoRecibido] = useState<string>("")
  const [posNumeroOperacion, setPosNumeroOperacion] = useState("")
  const { data: adquirentesPos = [] } = useQuery({ queryKey: ['pos-adquirentes-activos'], queryFn: () => listAdquirentesPos(false) })
  const posPredeterminado = adquirentesPos[0]
  const canalExterno = metodoPago === 'tarjeta' ? 'pos' : ['yape', 'plin'].includes(metodoPago) ? 'qr' : metodoPago === 'pago_link' ? 'link' : null

  // Estados para series y correlativos
  const [documentosSeries, setDocumentosSeries] = useState<DocumentosSeries>({
    facturaActual: 1,
    boletaActual: 1,
  })

  // Estados para UI y modal
  const [isShortcutsDialogOpen, setIsShortcutsDialogOpen] = useState(false)
  const [precioMayoristaMode, setPrecioMayoristaMode] = useState<boolean>(false)
  const [pendingSaleData, setPendingSaleData] = useState<SaleFormData | null>(null)
  // M5: clave de idempotencia por intento de venta; se regenera al limpiar el carrito
  const saleIdempotencyKey = useRef<string>(crypto.randomUUID())

  // Estados para selección de códigos de barras
  const [isBarcodeSelectionDialogOpen, setIsBarcodeSelectionDialogOpen] = useState(false)
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<any>(null)
  const [availableBarcodes, setAvailableBarcodes] = useState<any[]>([])
  const [isLoadingBarcodesSelection, setIsLoadingBarcodesSelection] = useState(false)

  // Estados para descuentos
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false)
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("fixed")
  const [discountValue, setDiscountValue] = useState("")
  const [saleDiscount, setSaleDiscount] = useState<{
    isDiscount: boolean
    type: "percentage" | "fixed"
    value: number
    amount: number
  }>({
    isDiscount: false,
    type: "percentage",
    value: 0,
    amount: 0,
  })  // Estados para búsqueda de productos
  const [productSearchTerm, setProductSearchTerm] = useState("")
  const [productSearchResults, setProductSearchResults] = useState<any[]>([])
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false)
  const [isLoadingProductSearch, setIsLoadingProductSearch] = useState(false)

  // Estados para vista de imagen del carrito
  const [isCartImageViewOpen, setIsCartImageViewOpen] = useState(false)
  const [selectedCartImageUrl, setSelectedCartImageUrl] = useState<string>("")

  // Referencias
  const lastProductRef = useRef<any>(null)
  const productSearchRef = useRef<HTMLDivElement>(null)
  const productSearchInputRef = useRef<HTMLInputElement>(null)

  // Queries para datos
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  })

  const { data: company } = useQuery({
    queryKey: ["company-for-sales"],
    queryFn: fetchCompanyForSales,
  })  // ================================
  // FUNCIONES DE BÚSQUEDA Y PRODUCTOS
  // ================================

  // Función optimizada para buscar productos por nombre o código de barras
  const searchProducts = async (searchTerm: string) => {
    if (!searchTerm.trim() || !products) {
      setProductSearchResults([])
      setIsProductSearchOpen(false)
      return
    }

    setIsLoadingProductSearch(true)

    try {
      // Búsqueda por nombre (búsqueda rápida local)
      let filteredByName = products.filter(product =>
        product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) &&
        product.stock > 0
      ).slice(0, 10)

      // Ajustar precios de oferta en los resultados por nombre
      filteredByName = filteredByName.map(product => {
        if (product.es_oferta && product.precio_oferta_con_igv && product.precio_oferta_con_igv !== "0.00") {
          return {
            ...product,
            precio_unitario_con_igv: product.precio_oferta_con_igv,
            precio_unitario: product.precio_oferta || "0.00",
            _esOfertaVisual: true // flag opcional para UI
          } as typeof product
        }
        return product
      })

      // Búsqueda adicional por código de barras si el término parece ser alfanumérico
      if (/^[a-zA-Z0-9]+$/.test(searchTerm.trim()) && searchTerm.length >= 3) {
        let filteredByBarcode = products.filter(product => {
          const productAny = product as any
          return productAny.codigos_barras &&
            Array.isArray(productAny.codigos_barras) &&
            productAny.codigos_barras.some((codigoBarras: any) =>
              codigoBarras.codigo_barras && 
              typeof codigoBarras.codigo_barras === 'string' &&
              codigoBarras.codigo_barras.toLowerCase().includes(searchTerm.toLowerCase())
            ) && product.stock > 0
        }).slice(0, 5)

        // Ajustar precios de oferta en los resultados por código de barras
        filteredByBarcode = filteredByBarcode.map(product => {
          if (product.es_oferta && product.precio_oferta_con_igv && product.precio_oferta_con_igv !== "0.00") {
            return {
              ...product,
              precio_unitario_con_igv: product.precio_oferta_con_igv,
              precio_unitario: product.precio_oferta || "0.00",
              _esOfertaVisual: true
            } as typeof product
          }
          return product
        })

        // Combinar resultados sin duplicados
        const combinedResults = [...filteredByName]
        filteredByBarcode.forEach(product => {
          if (!combinedResults.find(p => p.id_producto === product.id_producto)) {
            combinedResults.push(product)
          }
        })

        setProductSearchResults(combinedResults.slice(0, 10))
      } else {
        setProductSearchResults(filteredByName)
      }

      setIsProductSearchOpen(true)
    } catch (error) {
      console.error("Error en búsqueda de productos:", error)
      setProductSearchResults([])
      toast.error("Error al buscar productos")
    } finally {
      setIsLoadingProductSearch(false)
    }
  }

  // Función para obtener la URL de la imagen del producto
  const getProductImageUrl = (product: any) => {
    if (!product?.imagen_url) return null

    // Si la imagen ya es una URL completa
    if (product.imagen_url.startsWith('http')) {
      return product.imagen_url
    }

    const baseUrl = API_URL.replace('/api', '')

    // Si la imagen ya incluye la ruta /uploads/
    if (product.imagen_url.includes('/uploads/')) {
      return `${baseUrl}${product.imagen_url}`
    }

    // Extraer solo el nombre del archivo y construir la ruta
    const filename = product.imagen_url.split('\\').pop() || product.imagen_url.split('/').pop() || product.imagen_url
    return `${baseUrl}/uploads/productos/${filename}`
  }

  // Función para obtener códigos de barras de un producto
  const getProductBarcodes = async (product: any) => {
    try {
      setIsLoadingBarcodesSelection(true)
      const response = await obtenerCodigosBarras(product.id_producto)

      if (response?.codigos_barras?.length > 0) {
        return response.codigos_barras
      }

      // Crear código temporal si no tiene códigos de barras
      return [{
        id: null,
        codigo: product.sku || `TEMP-${product.id_producto}`,
        cantidad: product.stock || 1,
        fecha_ingreso: new Date().toISOString()
      }]
    } catch (error) {
      console.error("Error al obtener códigos de barras:", error)
      toast.error("Error al obtener códigos de barras del producto")
      return []
    } finally {
      setIsLoadingBarcodesSelection(false)
    }
  }

  const [ticketHtml, setTicketHtml] = useState<string>("")
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false)

  const [pdfBlob] = useState<Blob | null>(null)

  const [showSaleSuccessAfterTicket, setShowSaleSuccessAfterTicket] = useState(false)

  // Función para seleccionar un código de barras específico
  const selectBarcode = (selectedBarcode: any) => {
    const product = selectedProductForBarcode

    const searchResult = {
      producto: product,
      codigo_barras: {
        codigo: selectedBarcode.codigo,
        cantidad: product.stock ?? selectedBarcode.cantidad,
        id: selectedBarcode.id
      }
    }

    setBarcodeSearchResults(prev => {
      const exists = prev.find(result =>
        result.producto.id_producto === product.id_producto &&
        result.codigo_barras.codigo === selectedBarcode.codigo
      )

      if (exists) {
        toast.info(`${product.nombre} con código ${selectedBarcode.codigo} ya está en la lista`)
        return prev
      }

      return [searchResult, ...prev]
    })

    toast.success(`${product.nombre} agregado con código ${selectedBarcode.codigo}`)

    // Cerrar diálogos
    setIsBarcodeSelectionDialogOpen(false)
    setSelectedProductForBarcode(null)
    setAvailableBarcodes([])
    setIsProductSearchOpen(false)
    setProductSearchTerm("")
    setProductSearchResults([])
  }
  // Función para agregar producto desde búsqueda - agregar directamente al carrito
  const addProductFromSearch = async (product: any) => {
    try {
      // Obtener códigos de barras del producto
      const barcodes = await getProductBarcodes(product)

      if (barcodes.length === 0) {
        toast.error("No se pudieron obtener códigos de barras para este producto")
        return
      }

      // Usar el primer código de barras disponible (por lo general será uno temporal/generado)
      const selectedBarcode = barcodes[0]

      // Crear el resultado simulando la respuesta de búsqueda por código de barras
      const searchResult = {
        producto: product,
        codigo_barras: {
          codigo: selectedBarcode.codigo,
          cantidad: product.stock ?? selectedBarcode.cantidad,
          id: selectedBarcode.id
        }
      }

      // Agregar directamente al carrito usando la función existente
      await addProductDirectlyToCart(searchResult, precioMayoristaMode)

      // Cerrar el dropdown de búsqueda
      setIsProductSearchOpen(false)
      setProductSearchTerm("")
      setProductSearchResults([])

      // Mantener el foco en el campo de búsqueda después de agregar un producto
      setTimeout(() => {
        if (productSearchInputRef.current) {
          productSearchInputRef.current.focus()
        }
      }, 150)

    } catch (error) {
      console.error("Error al agregar producto desde búsqueda:", error)
      toast.error("Error al agregar el producto al carrito")
    }
  }

  // Función para obtener precio según modo (unitario/mayorista)
  const getDisplayPrice = (product: any) => {
    if (precioMayoristaMode && product.precio_mayoritario && product.precio_mayoritario !== "0.00") {
      return formatCurrency(Number.parseFloat(product.precio_mayoritario_con_igv))
    }
    return formatCurrency(Number.parseFloat(product.precio_unitario_con_igv))
  }

  // ============================
  // FUNCIONES DE PRECIO VARIABLE
  // ============================

  // Función para verificar permisos de precio variable
  const canModifyPrice = (): boolean => {
    return user?.id_role === 1 || user?.id_role === 2 // Gerente o Administrador
  }

  // Función para activar/desactivar precio variable en un item del carrito
  const toggleItemVariablePrice = (index: number) => {
    if (!canModifyPrice()) {
      toast.error("No tiene permisos para modificar precios. Solo Gerentes y Administradores pueden hacerlo.")
      return
    }
    const updatedCart = [...cart]
    const item = updatedCart[index]

    if (!item.esPrecioVariable) {
      // Activar precio variable - guardar precios originales
      item.precioOriginal = item.precio_unitario
      item.precioOriginalConIgv = item.precio_unitario_con_igv
      item.esPrecioVariable = true

      setCart(updatedCart)

      // Evitar que el input de precio robe el foco - esperar un momento antes de permitir que se enfoque
      setTimeout(() => {
        if (productSearchInputRef.current) {
          productSearchInputRef.current.focus()
        }
      }, 100)

    } else {
      // Desactivar precio variable - restaurar precios originales
      item.precio_unitario = item.precioOriginal || item.precio_unitario
      item.precio_unitario_con_igv = item.precioOriginalConIgv || item.precio_unitario_con_igv
      item.esPrecioVariable = false
      item.precioVariable = undefined
      item.precioVariableConIgv = undefined
      item.precioOriginal = undefined
      item.precioOriginalConIgv = undefined

      // Recalcular subtotal
      item.subtotal = Number.parseFloat(item.precio_unitario_con_igv) * item.cantidad

      setCart(updatedCart)
      toast.success(`Precio original restaurado para ${item.nombre}`)
    }
  }

  // FUNCIONES DE DESCUENTOS
  // ============================

  // Función para verificar permisos de descuento
  const canApplyDiscount = (): boolean => {
    return user?.id_role === 1 || user?.id_role === 2 // Gerente o Administrador
  }

  // Función para aplicar descuento global
  const applyDiscount = () => {
    if (!canApplyDiscount()) {
      toast.error("No tiene permisos para aplicar descuentos. Solo Gerentes y Administradores pueden hacerlo.")
      return
    }

    if (cart.length === 0) {
      toast.error("No hay productos en el carrito para aplicar descuento")
      return
    }

    // Verificar productos en oferta
    const offerProducts = cart.filter(item => item.es_oferta)
    if (offerProducts.length > 0) {
      const offerProductNames = offerProducts.map(item => item.nombre).join(', ')
      toast.warning(`Advertencia: La venta contiene productos en oferta: ${offerProductNames}. El descuento se aplicará sobre el precio total.`)
    }

    // Validar valor del descuento
    if (!discountValue || isNaN(Number(discountValue)) || Number(discountValue) <= 0) {
      toast.error("Por favor ingrese un valor de descuento válido")
      return
    }

    const value = Number(discountValue)
    let discountAmount = 0

    if (discountType === "percentage") {
      if (value > 100) {
        toast.error("El porcentaje de descuento no puede ser mayor a 100%")
        return
      }
      discountAmount = (total * value) / 100
    } else {
      if (value > total) {
        toast.error("El descuento no puede ser mayor al total de la venta")
        return
      }
      discountAmount = value
    }

    setSaleDiscount({
      isDiscount: true,
      type: discountType,
      value: value,
      amount: discountAmount,
    })

    setIsDiscountDialogOpen(false)
    setDiscountValue("")

    toast.success(
      `Descuento de ${discountType === "percentage" ? `${value}%` : formatCurrency(value)} aplicado correctamente`,
    )
  }

  // Función para remover descuento
  const removeDiscount = () => {
    if (!canApplyDiscount()) {
      toast.error("No tiene permisos para remover descuentos")
      return
    }

    setSaleDiscount({ isDiscount: false, type: "percentage", value: 0, amount: 0 })
    toast.info("Descuento removido")
  }

  // Función para abrir diálogo de descuento
  const openDiscountDialog = () => {
    if (!canApplyDiscount()) {
      toast.error("No tiene permisos para aplicar descuentos. Solo Gerentes y Administradores pueden hacerlo.")
      return
    }

    if (cart.length === 0) {
      toast.error("No hay productos en el carrito para aplicar descuento")
      return
    }

    setIsDiscountDialogOpen(true)
  }

  // Función para aplicar descuento rápido de 1 sol
  const applyQuickDiscount1Sol = () => {
    if (!canApplyDiscount() || cart.length === 0) {
      toast.error("No se puede aplicar descuento")
      return
    }

    if (total < 1) {
      toast.error("El total debe ser mayor o igual a 1 sol para aplicar este descuento")
      return
    }

    setSaleDiscount({
      isDiscount: true,
      type: "fixed",
      value: 1,
      amount: 1,
    })

    toast.success("Descuento de 1 sol aplicado")
  }

  // Función para aplicar descuento rápido de 2 soles
  const applyQuickDiscount2Soles = () => {
    if (!canApplyDiscount() || cart.length === 0) {
      toast.error("No se puede aplicar descuento")
      return
    }

    if (total < 2) {
      toast.error("El total debe ser mayor o igual a 2 soles para aplicar este descuento")
      return
    }

    setSaleDiscount({
      isDiscount: true,
      type: "fixed",
      value: 2,
      amount: 2,
    })

    toast.success("Descuento de 2 soles aplicado")
  }
  // ============================
  // FUNCIONES DE ROLES Y PERMISOS
  // ============================

  const canEmitWithoutSunat = (): boolean => {
    const userRole = typeof user?.role === 'object' && user?.role?.name
      ? user.role.name
      : typeof user?.role === 'string'
        ? user.role
        : user?.id_role === 1
          ? 'Gerente'
          : null
    return userRole === "Gerente"
  }
  // ============================
  // MUTACIONES Y QUERIES
  // ============================
  const createSaleMutation = useMutation({
    mutationFn: createSale, onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      toast.success("Venta registrada exitosamente")

      setCurrentSale(data.venta)

      // Dentro de createSaleMutation.onSuccess:
      if (tipoDocumento === "" || canEmitWithoutSunat()) {
        if (tipoDocumento === "") {
          await printTicketDirectly(data.venta.venta_id)
          setShowSaleSuccessAfterTicket(true)
        } else {
          setShowSaleSuccessDialog(true)
        }
        return
      }
      // Si hay comprobante, se maneja con el flujo de SUNAT (handleCloseInvoiceDialog)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al registrar la venta")
    },
  })  // ============================
  // EFECTOS Y HOOKS
  // ============================

  // Efecto para enfocar automáticamente en el buscador al cargar la página
  useEffect(() => {
    const focusSearchInput = () => {
      const searchInput = document.querySelector('input[placeholder="Buscar productos por nombre o código de barras..."]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
      }
    }

    // Ejecutar después de que el componente se haya renderizado completamente
    const timer = setTimeout(focusSearchInput, 100)

    return () => clearTimeout(timer)
  }, []) // Solo se ejecuta una vez al montar el componente

  // Efecto para inicializar configuración de impresoras térmicas
  useEffect(() => {
    // Configurar detección automática de impresoras térmicas
    setupThermalPrinterAutoDetection()

    // Configurar preferencias de impresión térmica
    configureThermalPrinterSettings({
      forceDirectPrint: true,
      preferredWidth: '80mm',
      autoDetectPrinter: true,
      silentMode: true
    })
  }, [])

  // Efecto para cargar series de documentos
  useEffect(() => {
    const seriesGuardadas = localStorage.getItem("documentosSeries")
    if (seriesGuardadas) {
      try {
        setDocumentosSeries(JSON.parse(seriesGuardadas))
      } catch (e) {
        console.error("Error al cargar series de documentos:", e)
      }
    }
  }, [])

  // Efecto para guardar series en localStorage
  useEffect(() => {
    localStorage.setItem("documentosSeries", JSON.stringify(documentosSeries))
  }, [documentosSeries])

  // Efecto para guardar carritos en localStorage
  useEffect(() => {
    localStorage.setItem("erpComputacionSavedCarts", JSON.stringify(savedCarts))
  }, [savedCarts])

  // Efecto para refrescar stock automáticamente después de cargar carrito
  useEffect(() => {
    if (needsStockRefresh && cart.length > 0) {
      // Ejecutar el refresh con un pequeño delay para asegurar que el estado esté actualizado
      const timer = setTimeout(async () => {
        try {
          await refreshAllCartItemsStock()
          setNeedsStockRefresh(false) // Limpiar la bandera después del refresh
          toast.info("Stock actualizado automáticamente", { duration: 2000 })
        } catch (error) {
          console.error("Error en refresh automático:", error)
          setNeedsStockRefresh(false) // Limpiar la bandera incluso si hay error
        }
      }, 500) // 500ms es suficiente para que se actualice el estado

      return () => clearTimeout(timer)
    }
  }, [needsStockRefresh, cart.length])

  // Efecto para manejar escáner de códigos de barras
  useEffect(() => {
    let barcodeBuffer = ""
    let lastKeyTime = 0
    let lastProcessedBarcode = ""
    let lastProcessedTime = 0
    const SCAN_TIMEOUT = 50
    const DUPLICATE_SCAN_TIMEOUT = 500 // Reducido para permitir escaneo más rápido

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isBarcodeScannerActive) return

      // No procesar escáner si estamos en un input, textarea o select
      if (e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement) {
        return
      }

      // No procesar si hay combinaciones de teclas especiales (atajos)
      if (e.altKey || e.ctrlKey || e.metaKey) {
        return
      }

      const currentTime = Date.now()

      // Reiniciar buffer si pasó mucho tiempo
      if (currentTime - lastKeyTime > SCAN_TIMEOUT && barcodeBuffer !== "") {
        if (currentTime - lastKeyTime > 500) {
          barcodeBuffer = ""
        }
      }

      lastKeyTime = currentTime

      // Ignorar teclas de control excepto Enter
      const controlKeys = ["Shift", "Tab", "CapsLock", "Escape"]
      if (controlKeys.includes(e.key)) {
        return
      }

      // Procesar código escaneado al presionar Enter
      if (e.key === "Enter" && barcodeBuffer.length > 3) {
        e.preventDefault()

        const scanDuration = currentTime - lastScanTime

        // Prevenir procesamiento de códigos duplicados
        if (barcodeBuffer === lastProcessedBarcode &&
          currentTime - lastProcessedTime < DUPLICATE_SCAN_TIMEOUT) {

          barcodeBuffer = ""
          return
        }

        if ((scanDuration < 1000 || lastScanTime === 0) && !isProcessingBarcode) {
          setIsScanning(true)
          setScannedBarcode(barcodeBuffer)

          // Actualizar información del último código procesado
          lastProcessedBarcode = barcodeBuffer
          lastProcessedTime = currentTime

          // Verificar si el campo de búsqueda está enfocado
          const activeElement = document.activeElement
          const isSearchFieldFocused = activeElement &&
            activeElement.getAttribute('placeholder')?.includes('Buscar productos')

          if (isSearchFieldFocused) {
            // Si está en el campo de búsqueda, usar la función inteligente
            handleSearchOrBarcode(barcodeBuffer)
          } else {
            // Si no está en el campo de búsqueda, usar el manejo normal de escáner
            handleScannedBarcode(barcodeBuffer)
          }

          setLastScanTime(currentTime)
          setTimeout(() => setIsScanning(false), 1500)
        }

        barcodeBuffer = ""
      } else {
        barcodeBuffer += e.key
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isBarcodeScannerActive, isProcessingBarcode])  // Efecto para atajos de teclado
  useEffect(() => {
    let altShiftPressed = false
    let altShiftTimer: NodeJS.Timeout | null = null
    const handleKeyDown = (e: KeyboardEvent) => {
      // Verificar atajos directos independientemente del enfoque
      if (e.altKey && e.shiftKey) {
        // Métodos de pago - siempre procesar estos atajos
        if (e.key.toLowerCase() === 'y') {
          e.preventDefault()
          setMetodoPago('yape')
          return
        }
        if (e.key.toLowerCase() === 'p') {
          e.preventDefault()
          setMetodoPago('plin')
          return
        }
        if (e.key.toLowerCase() === 't') {
          e.preventDefault()
          setMetodoPago('tarjeta')
          return
        }
        if (e.key.toLowerCase() === 'e') {
          e.preventDefault()
          setMetodoPago('efectivo')
          return
        }
      }

      // Detectar cuando se presiona Alt + Shift juntos
      if (e.altKey && e.shiftKey && (e.key === 'Alt' || e.key === 'Shift')) {
        altShiftPressed = true

        // Limpiar timer anterior si existe
        if (altShiftTimer) {
          clearTimeout(altShiftTimer)
        }

        // Esperar un poco para capturar la siguiente tecla
        altShiftTimer = setTimeout(() => {
          altShiftPressed = false
        }, 500)

        return
      }      // Si se detectó Alt + Shift y ahora viene una tecla numérica o específica
      if (altShiftPressed && e.altKey && e.shiftKey) {
        // Mapear códigos de teclas numéricas (más confiable que e.key)
        const documentTypeShortcuts: Record<string, { type: string, label: string }> = {
          "Digit1": { type: "", label: "Nota de venta" },
          "Numpad1": { type: "", label: "Nota de venta" },
          "1": { type: "", label: "Nota de venta" },
          "Digit2": { type: "03", label: "Boleta" },
          "Numpad2": { type: "03", label: "Boleta" },
          "2": { type: "03", label: "Boleta" },
          "Digit3": { type: "01", label: "Factura" },
          "Numpad3": { type: "01", label: "Factura" },
          "3": { type: "01", label: "Factura" }
        }

        // Buscar por code primero, luego por key
        const shortcut = documentTypeShortcuts[e.code] || documentTypeShortcuts[e.key]
        if (shortcut) {
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()

          setTipoDocumento(shortcut.type)
          toast.info(`Tipo de documento: ${shortcut.label}`)

          altShiftPressed = false
          if (altShiftTimer) {
            clearTimeout(altShiftTimer)
            altShiftTimer = null
          }
          return
        }
      }

      // Atajos directos usando códigos de tecla (fallback)
      if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const directShortcuts: Record<string, { type: string, label: string }> = {
          "Digit1": { type: "", label: "Nota de venta" },
          "Numpad1": { type: "", label: "Nota de venta" },
          "Digit2": { type: "03", label: "Boleta" },
          "Numpad2": { type: "03", label: "Boleta" },
          "Digit3": { type: "01", label: "Factura" },
          "Numpad3": { type: "01", label: "Factura" }
        }

        const directShortcut = directShortcuts[e.code]
        if (directShortcut) {
          e.preventDefault()
          e.stopPropagation()
          e.stopImmediatePropagation()
          setTipoDocumento(directShortcut.type)
          toast.info(`Tipo de documento: ${directShortcut.label}`)
          return
        }
      }

      // Verificar si la tecla es F8 (registrar venta) - debe funcionar en cualquier contexto
      if (e.key === "F8") {
        e.preventDefault()
        if (cart.length > 0) {
          handleSubmit()
        } else {
          toast.error("Agregue productos al carrito antes de registrar la venta")
        }
        return
      }

      // Verificar si la tecla es F4 (guardar carrito) - debe funcionar en cualquier contexto
      if (e.key === "F4") {
        e.preventDefault()
        if (cart.length > 0) {
          saveCurrentCart()
        } else {
          toast.error("No hay productos en el carrito para guardar")
        }
        return
      }

      // Permitir atajos con Ctrl incluso cuando hay inputs enfocados
      if (e.ctrlKey && !e.altKey && !e.shiftKey) {
        if (e.key === "d" || e.key === "D") {
          e.preventDefault()
          // Ctrl + D: Abrir diálogo de descuento
          openDiscountDialog()
          return
        } else if (e.key === "1") {
          e.preventDefault()
          applyQuickDiscount1Sol()
          return
        } else if (e.key === "2") {
          e.preventDefault()
          applyQuickDiscount2Soles()
          return
        }
      }

      // Permitir Alt+Shift+D para remover descuento incluso cuando hay inputs enfocados
      if (e.altKey && e.shiftKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault()
        if (saleDiscount.isDiscount) {
          removeDiscount()
        } else {
          toast.info("No hay descuento aplicado para remover")
        }
        return
      }

      // No capturar otros atajos si estamos en inputs
      if (e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement) {
        return
      }      // Atajos con teclas de función (F1-F12)
      const functionKeyActions = {
        "F1": () => setIsShortcutsDialogOpen(true),
        "F2": () => {
          setIsBarcodeScannerActive(!isBarcodeScannerActive)
          toast.info(`Escáner ${!isBarcodeScannerActive ? "activado" : "desactivado"}`)
        },
        "F3": () => openBarcodeScanner(),
        "F5": () => savedCarts.length > 0 ? setIsSavedCartsDialogOpen(true) : toast.info("No hay carritos guardados"),
        "F6": () => startNewCart(),
        "F7": () => tipoDocumento !== "" ? setIsClienteDialogOpen(true) : toast.info("Seleccione primero un tipo de documento"),
        "F9": () => {
          if (cart.length > 0 || metodoPago !== "efectivo" || observaciones !== "" || tipoDocumento !== "") {
            if (window.confirm("¿Está seguro que desea reiniciar para una nueva venta? Se perderán los datos actuales.")) {
              resetForNewSale()
            }
          } else {
            toast.info("La venta ya está lista para nuevos productos")
          }
        }
      }

      if (functionKeyActions[e.key as keyof typeof functionKeyActions]) {
        e.preventDefault()
        functionKeyActions[e.key as keyof typeof functionKeyActions]()
        return
      }

      // Atajos con Alt + Shift para métodos de pago y funciones
      if (e.altKey && e.shiftKey) {
        const paymentMethods = {
          "e": "efectivo", "E": "efectivo",
          "t": "tarjeta", "T": "tarjeta",
          "r": "transferencia", "R": "transferencia",
          "y": "yape", "Y": "yape",
          "p": "plin", "P": "plin"
        }

        if (paymentMethods[e.key as keyof typeof paymentMethods]) {
          e.preventDefault()
          const method = paymentMethods[e.key as keyof typeof paymentMethods]
          setMetodoPago(method)
          toast.info(`Método de pago: ${method.charAt(0).toUpperCase() + method.slice(1)}`)
          return
        }

        // Agregar último producto al carrito
        if ((e.key === "a" || e.key === "A") && lastProductRef.current) {
          e.preventDefault()
          const productToAdd = products?.find((p) => p.id_producto === lastProductRef.current.producto.id_producto)
          if (productToAdd) {
            addToCart(productToAdd, {
              codigo: lastProductRef.current.codigo_barras.codigo,
              cantidad: productToAdd.stock ?? 1,
            })
          } else {
            toast.error("No hay un producto seleccionado para agregar")
          }
          return
        }

        // Cambiar modo de precio
        if (e.key === "m" || e.key === "M") {
          e.preventDefault()
          setPrecioMayoristaMode(!precioMayoristaMode)
          toast.info(`Modo de precio cambiado a: ${!precioMayoristaMode ? "Mayorista" : "Unitario"}`)
          return
        }
      }
    }

    // Agregar el listener con captura y pasivo para que se ejecute antes que otros
    window.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true })
  }, [isBarcodeScannerActive, cart.length, savedCarts.length, tipoDocumento, precioMayoristaMode, saleDiscount.isDiscount, setMetodoPago])

  // Efecto para cerrar dropdown de búsqueda al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setIsProductSearchOpen(false)
      }
    }

    if (isProductSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isProductSearchOpen])

  // Efecto para manejar mensajes de vista previa PDF y enfocar botón tras regresar
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'CONVERT_TO_PDF') {
        try {
          const pdfBlob = await convertHtmlToPdf(event.data.html)
          const url = URL.createObjectURL(pdfBlob)
          const a = document.createElement('a')
          a.href = url

          const fileName = event.data.fileName ||
            `${tipoDocumento === "01" ? "Factura" : "Boleta"}_${Date.now()}`
          a.download = `${fileName}.pdf`

          // Guardar estado para regresar el foco tras descargar PDF
          window.localStorage.setItem('pdfViewed', 'true');

          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)

          toast.success('PDF descargado correctamente')

          // Forzar enfoque del botón "Nueva Venta" tras descargar PDF
          const focusNuevaVentaBtn = () => {
            // Estrategia completa: intentar con todos los selectores posibles
            let nuevaVentaBtn: HTMLButtonElement | null = null;

            // Intentos secuenciales con diferentes selectores
            const selectors = [
              '#nuevaVentaBtn',
              '#nuevaVentaSuccessBtn',
              '.dialog-success-nueva-venta-btn',
              '.focus-ring-button',
              'button:contains("Nueva Venta")'
            ];

            // Intentar cada selector
            for (const selector of selectors) {
              if (selector.includes(':contains')) {
                // Búsqueda especial por texto
                const buttons = Array.from(document.querySelectorAll('button'));
                nuevaVentaBtn = buttons.find(btn =>
                  btn.textContent?.toLowerCase().includes('nueva venta')
                ) as HTMLButtonElement;
              } else {
                // Búsqueda normal por selector
                nuevaVentaBtn = document.querySelector(selector) as HTMLButtonElement;
              }

              // Si encontramos un botón, salir del bucle
              if (nuevaVentaBtn) break;
            }

            if (nuevaVentaBtn) {
              // Asegurar visibilidad
              nuevaVentaBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });

              // Enfocar con fuerza
              try {
                nuevaVentaBtn.focus({ preventScroll: false });
                // Efecto visual
                nuevaVentaBtn.classList.add('focus-ring-pulse');
                setTimeout(() => nuevaVentaBtn.classList.remove('focus-ring-pulse'), 2000);
              } catch (e) {
                // Error al enfocar botón Nueva Venta
              }
            } else {
              // No se encontró el botón "Nueva Venta" para enfocar
            }
          };

          // Ejecutar varias veces para asegurar que funcione en todos los navegadores
          const delays = [100, 300, 500, 1000, 1500, 2000];
          delays.forEach(delay => setTimeout(focusNuevaVentaBtn, delay));

        } catch (error) {
          toast.error('Error al generar PDF para descarga')
        }
      }
    };

    // Escuchar mensajes para conversión a PDF
    window.addEventListener('message', handleMessage);

    // Escuchar eventos de foco para restaurarlo cuando vuelve del PDF
    const handleFocus = () => {
      // Cuando la ventana recupera el foco (tras ver un PDF), enfocar el botón
      if (isInvoiceDialogOpen || showSaleSuccessDialog) {
        const focusNuevaVentaBtn = () => {
          // Buscar en ambos diálogos
          const btnToFocus = document.getElementById('nuevaVentaBtn') ||
            document.getElementById('nuevaVentaSuccessBtn') ||
            document.querySelector('.dialog-success-nueva-venta-btn');

          if (btnToFocus instanceof HTMLButtonElement) {
            btnToFocus.focus();
            // Log eliminado

            // Efecto visual
            btnToFocus.classList.add('focus-ring-pulse');
            setTimeout(() => btnToFocus.classList.remove('focus-ring-pulse'), 2000);
          }
        };

        // Ejecutar múltiples veces para asegurar que funcione
        setTimeout(focusNuevaVentaBtn, 100);
        setTimeout(focusNuevaVentaBtn, 300);
        setTimeout(focusNuevaVentaBtn, 500);
      }
    };

    // Escuchar eventos de enfoque de la ventana
    window.addEventListener('focus', handleFocus);

    // Escuchar cambios de visibilidad del documento
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' &&
        (isInvoiceDialogOpen || showSaleSuccessDialog)) {
        // Marcar flag para indicar que se debe enfocar al volver
        window.localStorage.setItem('pdfViewed', 'true');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [tipoDocumento, isInvoiceDialogOpen, showSaleSuccessDialog]);

  // Enfoque automático del input de búsqueda al montar el componente
  useEffect(() => {
    // Enfocar el input de búsqueda de productos al cargar la página
    const timer = setTimeout(() => {
      if (productSearchInputRef.current) {
        productSearchInputRef.current.focus()
      }
    }, 300) // Pequeño delay para asegurar que el componente esté completamente renderizado

    return () => clearTimeout(timer)
  }, []) // Solo se ejecuta al montar el componente
  // ============================
  // CÁLCULOS Y TOTALES
  // ============================

  const totalItems = cart.reduce((acc, item) => acc + item.cantidad, 0)
  const subtotal = cart.reduce((acc, item) => acc + Number.parseFloat(item.precio_unitario) * item.cantidad, 0)
  const total = cart.reduce((acc, item) => acc + item.subtotal, 0)
  const igv = total - subtotal
  const totalWithDiscount = saleDiscount.isDiscount ? total - saleDiscount.amount : total
  // ============================
  // FUNCIONES DE UTILIDADES
  // ============================
  // Función para calcular cantidad reservada excluyendo el carrito actual
  const getReservedQuantityExcludingCurrent = (codigo: string, currentProductId: number): number => {
    let reservedQuantity = 0

    // Solo sumar cantidades en carritos guardados (no en el carrito actual)
    for (const savedCart of savedCarts) {
      for (const item of savedCart.items) {
        if (item.producto_id === currentProductId && item.codigos_barras.includes(codigo)) {
          reservedQuantity += item.cantidad
        }
      }
    }

    return reservedQuantity
  }
  // Función para obtener información detallada de disponibilidad para un item del carrito
  const getCartItemAvailabilityInfo = (item: CartItem) => {
    const barcodeInfo = item.codigos_barras.map(codigo => {
      const stockOriginal = item.codigosMaximos?.[codigo] || 1
      // Solo contar reservas de OTROS carritos, no del carrito actual
      const reservedInOtherCarts = getReservedQuantityExcludingCurrent(codigo, item.producto_id)
      const availableForThisItem = Math.max(0, stockOriginal - reservedInOtherCarts)

      return {
        codigo,
        stockOriginal,
        reservedInOtherCarts,
        availableForThisItem
      }
    })

    const totalAvailable = barcodeInfo.reduce((sum, info) => sum + info.availableForThisItem, 0)
    const totalReservedInOtherCarts = barcodeInfo.reduce((sum, info) => sum + info.reservedInOtherCarts, 0)

    return {
      barcodeInfo,
      totalAvailable,
      totalReservedInOtherCarts,
      currentQuantity: item.cantidad,
      canIncrease: item.cantidad < totalAvailable
    }
  }

  // Función para calcular vuelto
  const calcularVuelto = (): number => {
    if (metodoPago !== "efectivo" || !montoRecibido || isNaN(Number.parseFloat(montoRecibido))) {
      return 0
    }

    const montoRecibidoNum = Number.parseFloat(montoRecibido)
    return Math.max(0, montoRecibidoNum - totalWithDiscount)
  }

  // Función para abrir vista de imagen del carrito
  const openCartImageView = (imageUrl: string) => {
    setSelectedCartImageUrl(imageUrl)
    setIsCartImageViewOpen(true)
  }
  // ============================
  // FUNCIONES DE CARRITO
  // ============================
  // Función optimizada para agregar productos al carrito
  const addToCart = async (product: any, barcodeData?: any, usarPrecioMayorista = false) => {
    try {
      const barcodeToUse = barcodeData?.codigo || null
      // La fuente unica de stock es productos.stock (backend T3); barcode.cantidad es legado
      const maxQuantityAvailable = product.stock ?? barcodeData?.cantidad ?? 1

      if (!barcodeToUse) {
        toast.error(`No hay códigos de barras disponibles para ${product.nombre}`)
        return
      }

      // Validar precio mayorista
      if (usarPrecioMayorista && (!product.precio_mayoritario || product.precio_mayoritario === "0.00")) {
        toast.warning(`${product.nombre} no tiene precio mayorista definido. Se usará precio unitario.`)
        usarPrecioMayorista = false
      }

      // Buscar item existente en carrito PRIMERO
      const existingItemIndex = cart.findIndex(
        (item) => item.producto_id === product.id_producto && item.esPrecioMayorista === usarPrecioMayorista,
      )

      // Verificar disponibilidad real - solo contar carritos guardados, no el actual
      const reservedInOtherCarts = getReservedQuantityExcludingCurrent(barcodeToUse, product.id_producto)
      const realAvailableQuantity = maxQuantityAvailable - reservedInOtherCarts

      if (realAvailableQuantity <= 0) {
        toast.error(`No hay unidades disponibles de ${product.nombre} con el código ${barcodeToUse}`)
        return
      }

      if (existingItemIndex >= 0) {
        // Actualizar item existente
        const updatedCart = [...cart]
        const currentItem = updatedCart[existingItemIndex]

        if (currentItem.codigos_barras.includes(barcodeToUse)) {
          // Si el código ya está en el carrito, solo incrementamos la cantidad
          const availabilityInfo = getCartItemAvailabilityInfo(currentItem)

          if (currentItem.cantidad >= availabilityInfo.totalAvailable) {
            toast.warning(`No hay suficiente stock disponible para ${product.nombre}. Máximo disponible: ${availabilityInfo.totalAvailable}`)
            return
          }

          currentItem.cantidad += 1
          toast.success(`Se agregó una unidad más de ${product.nombre}`)
        } else {
          // Agregar nuevo código de barras al item existente
          currentItem.codigos_barras.push(barcodeToUse)
          currentItem.cantidad += 1

          // Asegurarse de tener el registro de cantidad máxima para este código
          if (!currentItem.codigosMaximos) currentItem.codigosMaximos = {}
          currentItem.codigosMaximos[barcodeToUse] = maxQuantityAvailable

          toast.success(`Se agregó ${product.nombre} con nuevo código de barras`)
        }

        // Recalcular subtotal
        currentItem.subtotal = Number.parseFloat(currentItem.precio_unitario_con_igv) * currentItem.cantidad

        setCart(updatedCart)

        // Solo mostrar mensaje de reservas si realmente hay reservas en otros carritos
        const message = reservedInOtherCarts > 0
          ? `${product.nombre} agregado. Hay ${reservedInOtherCarts} unidades reservadas en otros carritos.`
          : `${product.nombre} (+1)`

        toast[reservedInOtherCarts > 0 ? 'warning' : 'success'](message, {
          duration: reservedInOtherCarts > 0 ? 3000 : 1500
        })
      } else {
        // Crear nuevo item en carrito
        const { precioUnitario, precioUnitarioConIgv, esOferta } = calculateItemPricing(product, usarPrecioMayorista)

        const newItem = {
          producto_id: product.id_producto,
          nombre: product.nombre,
          precio_unitario: precioUnitario,
          precio_unitario_con_igv: precioUnitarioConIgv,
          precio_mayoritario: product.precio_mayoritario,
          precio_mayoritario_con_igv: product.precio_mayoritario_con_igv,
          precio_oferta: product.precio_oferta,
          precio_oferta_con_igv: product.precio_oferta_con_igv,
          es_oferta: esOferta,
          cantidad: 1,
          subtotal: Number.parseFloat(precioUnitarioConIgv),
          codigos_barras: [barcodeToUse],
          esPrecioMayorista: usarPrecioMayorista,
          codigosMaximos: { [barcodeToUse]: maxQuantityAvailable },
          esPrecioVariable: false,
          precioVariable: undefined,
          precioVariableConIgv: undefined,
          precioOriginal: undefined,
          precioOriginalConIgv: undefined,
          imagen_url: product.imagen_url || undefined,
        }

        // agregar el nuevo producto al INICIO del carrito
        setCart([newItem, ...cart])

        // Mensaje informativo
        let mensaje = `${product.nombre} agregado al carrito`
        if (esOferta) mensaje += " (precio oferta aplicado)"
        else if (usarPrecioMayorista) mensaje += " (precio mayorista)"

        // Solo mostrar mensaje de reservas si realmente hay reservas en otros carritos
        if (reservedInOtherCarts > 0) mensaje += `. Hay ${reservedInOtherCarts} unidades reservadas en otros carritos.`
        else mensaje = `${product.nombre} agregado` // Mensaje más corto para escaneo rápido

        toast[reservedInOtherCarts > 0 ? 'warning' : 'success'](mensaje, {
          duration: reservedInOtherCarts > 0 ? 3000 : 1500
        })
      }
    } catch (error) {
      console.error("Error al agregar al carrito:", error)
      toast.error(`Error al agregar ${product.nombre} al carrito. Verifica que el producto tenga códigos de barras.`)
    }
  }

  // Función auxiliar para calcular precios de items
  const calculateItemPricing = (product: any, usarPrecioMayorista: boolean) => {
    let precioUnitario, precioUnitarioConIgv, esOferta = false

    if (usarPrecioMayorista && product.precio_mayoritario) {
      // Precio mayorista (sin oferta)
      precioUnitario = product.precio_mayoritario
      precioUnitarioConIgv = product.precio_mayoritario_con_igv
    } else if (product.es_oferta && product.precio_oferta && product.precio_oferta !== "0.00") {
      // Precio de oferta
      precioUnitario = product.precio_oferta
      precioUnitarioConIgv = product.precio_oferta_con_igv || (Number.parseFloat(product.precio_oferta) * 1.18).toFixed(2)
      esOferta = true
    } else {
      // Precio normal
      precioUnitario = product.precio_unitario
      precioUnitarioConIgv = product.precio_unitario_con_igv
    }

    return { precioUnitario, precioUnitarioConIgv, esOferta }
  }
  // Modificar la función updateCartItemQuantity para permitir aumentar hasta el máximo disponible
  const updateCartItemQuantity = async (index: number, quantity: number) => {
    if (quantity < 1) return

    try {
      const updatedCart = [...cart]
      const currentItem = updatedCart[index]
      const availabilityInfo = getCartItemAvailabilityInfo(currentItem)

      // Si estamos aumentando la cantidad
      if (quantity > currentItem.cantidad) {
        // Verificar que no exceda la cantidad máxima disponible
        if (quantity > availabilityInfo.totalAvailable) {
          toast.error(
            `Solo hay ${availabilityInfo.totalAvailable} unidades disponibles para este producto${availabilityInfo.totalReservedInOtherCarts > 0
              ? ` (${availabilityInfo.totalReservedInOtherCarts} reservadas en otros carritos)`
              : ''
            }`,
            { duration: 4000 }
          )
          return
        }
      }

      // Actualizar la cantidad
      currentItem.cantidad = quantity

      // Recalcular subtotal
      currentItem.subtotal = Number.parseFloat(currentItem.precio_unitario_con_igv) * currentItem.cantidad

      setCart(updatedCart)

      // Mostrar información útil si se está acercando al límite
      if (quantity === availabilityInfo.totalAvailable && availabilityInfo.totalReservedInOtherCarts > 0) {
        toast.warning(
          `Has alcanzado el límite disponible. Hay ${availabilityInfo.totalReservedInOtherCarts} unidades reservadas en otros carritos.`,
          { duration: 3000 }
        )
      }
    } catch (error) {
      console.error("Error al actualizar cantidad:", error)
      toast.error("Error al actualizar la cantidad.")
    }
  }

  const removeFromCart = (index: number) => {
    const itemToRemove = cart[index]
    setCart(cart.filter((_, i) => i !== index))
    toast.info(`${itemToRemove.nombre} eliminado del carrito`, {
      duration: 2000,
    })
  }  // ============================
  // FUNCIONES DE FORMULARIO Y MANEJO DE VENTAS
  // ============================

  // Función principal de envío del formulario optimizada
  const handleSubmit = () => {
    // Validaciones básicas
    if (cart.length === 0) {
      toast.error("Debe agregar al menos un producto al carrito")
      return
    }

    // Preparar datos de venta con descuentos
    const saleData: SaleFormData = {
      id_cajero: user?.id || 1,
      metodo_pago: metodoPago,
      idempotency_key: saleIdempotencyKey.current,
      observaciones: observaciones,
      fecha: moment().tz("America/Lima").format("YYYY-MM-DD HH:mm:ss"),
      items: cart.map((item) => ({
        codigo_barras: item.codigos_barras[0],
        cantidad: item.cantidad,
        es_mayorista: item.esPrecioMayorista,
        // Si el item tiene precio variable, enviarlo como precio_unitario_con_igv
        ...(item.esPrecioVariable && item.precioVariableConIgv && {
          precio_unitario_con_igv: item.precioVariableConIgv
        })
      })),
      es_descuento: saleDiscount.isDiscount,
      descuento: saleDiscount.isDiscount ? saleDiscount.amount : undefined,
    }

    // Validar factura requiere datos de cliente
    if (tipoDocumento === "01" && !clienteData) {
      toast.error("Para emitir una factura debe ingresar los datos del cliente con RUC")
      setIsClienteDialogOpen(true)
      return
    }

    // Agregar información de comprobante
    if (tipoDocumento && (tipoDocumento === "01" || tipoDocumento === "03")) {
      saleData.comprobante = prepareComprobanteData()
    }

    // Agregar información de métodos de pago electrónicos
    if (metodoPago === "yape") {
      saleData.yape_celular = yapeCelular
      saleData.yape_codigo = yapeCodigo
    }

    if (metodoPago === "plin") {
      saleData.plin_celular = plinCelular
      saleData.plin_codigo = plinCodigo
    }

    if (canalExterno) {
      if (!posPredeterminado || !posNumeroOperacion.trim()) {
        toast.error(!posPredeterminado ? "Crisitus debe configurar un POS predeterminado" : "Ingresa el numero de operacion del voucher")
        return
      }
      saleData.pos_pago = { id_adquirente: posPredeterminado.id_adquirente, canal: canalExterno, numero_operacion: posNumeroOperacion.trim() }
    }

    // Guardar datos para procesamiento
    setPendingSaleData(saleData)
    setShowSunatAlert(true)
  }

  // Función auxiliar para preparar datos de comprobante
  const prepareComprobanteData = () => {
    const clienteNombre = clienteData
      ? tipoDocumento === "01"
        ? clienteData.razonSocial
        : clienteData.nombre || `${clienteData.apellidoPaterno || ""} ${clienteData.apellidoMaterno || ""} ${clienteData.nombres || ""}`
      : "CLIENTE GENERAL"

    const clienteNumeroDocumento = clienteData ? clienteData.numeroDocumento : "00000000"

    return {
      tipo_documento: tipoDocumento === "01" ? "1" : "3",
      cliente_tipo_documento: tipoDocumento === "01" ? "6" : "1",
      cliente_numero_documento: clienteNumeroDocumento,
      cliente_nombre: clienteNombre || "CLIENTE GENERAL",
      cliente_direccion: clienteData?.direccion || "",
    }
  }
  // ============================
  // FUNCIONES DE CONSULTA DE CLIENTES
  // ============================

  // Función optimizada para consultar cliente por RUC o DNI
  const consultarCliente = async () => {
    if (!documentoCliente) {
      toast.error(`Debe ingresar un ${tipoDocumento === "01" ? "RUC" : "DNI"}`)
      return
    }

    try {
      setIsConsultandoCliente(true)
      let resultado: ClienteConsultaResponse

      if (tipoDocumento === "01") {
        // Validar y consultar RUC
        if (documentoCliente.length !== 11) {
          toast.error("El RUC debe tener 11 dígitos")
          return
        }
        resultado = await consultarRuc(documentoCliente)
      } else {
        // Validar y consultar DNI
        if (documentoCliente.length !== 8) {
          toast.error("El DNI debe tener 8 dígitos")
          return
        }
        resultado = await consultarDni(documentoCliente)
      }

      setClienteData(resultado)
      setIsClienteDialogOpen(false)
      toast.success(`Datos de ${tipoDocumento === "01" ? "empresa" : "cliente"} obtenidos correctamente`)
    } catch (error: any) {
      console.error(`Error al consultar ${tipoDocumento === "01" ? "RUC" : "DNI"}:`, error)
      toast.error(
        error.message ||
        `No se pudo obtener información del ${tipoDocumento === "01" ? "RUC" : "DNI"}. Verifique el número ingresado.`,
      )
    } finally {
      setIsConsultandoCliente(false)
    }
  }

  // Función para limpiar datos del cliente
  const limpiarDatosCliente = () => {
    setClienteData(null)
    setDocumentoCliente("")
    toast.info("Datos del cliente limpiados")
  }
  // ============================
  // FUNCIONES DE INTEGRACIÓN CON SUNAT
  // ============================

  // Función principal para envío a SUNAT optimizada
  const handleSendToSunat = async () => {
    if (!pendingSaleData || !company) {
      toast.error("No hay datos de venta o empresa disponibles")
      return
    }

    try {
      setIsInvoiceSending(true)
      setShowSunatAlert(false)
      setIsInvoiceDialogOpen(true)

      // Guardar venta en base de datos PRIMERO
      const savedSaleResult = await createSale(pendingSaleData)
      setCurrentSale(savedSaleResult.venta)
      queryClient.invalidateQueries({ queryKey: ["sales"] })

      // Toda emisión fiscal pasa por el backend: las credenciales y el certificado
      // nunca se exponen al navegador ni se acepta un resultado simulado por el cliente.
      const result = await emitElectronicDocument(savedSaleResult.venta.venta_id)
      setInvoiceResult(result)
      if (!result.success) throw new Error(result.documento?.mensaje || "SUNAT rechazó el comprobante")
      toast.success(`${tipoDocumento === "01" ? "Factura" : "Boleta"} procesada correctamente`)
      queryClient.invalidateQueries({ queryKey: ["sales"] })
    } catch (error) {
      console.error("Error al enviar factura:", error)
      handleSunatError(error)
    } finally {
      setIsInvoiceSending(false)
      setPendingSaleData(null)
    }
  }

  // Función auxiliar para manejar errores de SUNAT
  const handleSunatError = (error: any) => {
    const errorMessage = error.message || "Error al enviar factura a SUNAT"
    toast.error(errorMessage)
    setInvoiceResult({
      sunatResponse: {
        success: false,
        error: errorMessage,
      },
    })
  }
  // ============================
  // EFECTOS Y FUNCIONES AUXILIARES
  // ============================
  // ============================
  // EFECTOS Y FUNCIONES AUXILIARES
  // ============================

  // Función para resetear el formulario y limpiar el estado del modal del ticket
  const resetForNewSale = () => {
    // Limpiar carrito y estados relacionados
    setCart([])
    saleIdempotencyKey.current = crypto.randomUUID()
    setProductSearchTerm("")
    setProductSearchResults([])
    setIsProductSearchOpen(false)
    setBarcodeSearchResults([])
    setBarcodeSearchResult(null)

    // Limpiar formulario de venta
    setMetodoPago("efectivo")
    setObservaciones("")
    setTipoDocumento("")

    // Limpiar datos de cliente
    setClienteData(null)
    setDocumentoCliente("")

    // Limpiar métodos de pago digitales
    setYapeCelular("")
    setYapeCodigo("")
    setPlinCelular("")
    setPlinCodigo("")
    setMontoRecibido("")

    // Limpiar descuentos
    setSaleDiscount({
      isDiscount: false,
      type: "percentage",
      value: 0,
      amount: 0,
    })

    // Limpiar estados de facturación
    setCurrentSale(null)
    setInvoiceResult(null)
    setPendingSaleData(null)

    // Resetear modo de precio si estaba en mayorista
    setPrecioMayoristaMode(false)

    // Mostrar mensaje de éxito
    toast.success("Listo para nueva venta", {
      icon: "🛒",
      duration: 2000,
    })

    // Enfocar en el campo de búsqueda de productos para agilizar el proceso
    setTimeout(() => {
      const searchInput = document.querySelector('input[placeholder*="Buscar productos"]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
      }
    }, 100)
  }  // Función para manejar el cierre del diálogo de factura y reiniciar para nueva venta
  const handleCloseInvoiceDialog = () => {
    // Marca para identificar que venimos del diálogo de factura
    window.localStorage.setItem('ventaCompletada', 'true');

    // Cerrar el diálogo de factura
    setIsInvoiceDialogOpen(false);

    // Crear una función reutilizable para enfocar el botón
    const focusNuevaVentaBtn = () => {
      // Estrategia completa: intentar con todos los selectores posibles
      let btnTarget: HTMLButtonElement | null = null;

      // Intentos secuenciales con diferentes selectores
      const selectors = [
        '#nuevaVentaSuccessBtn',
        '.dialog-success-nueva-venta-btn',
        '.focus-ring-button'
      ];

      // Intentar cada selector
      for (const selector of selectors) {
        btnTarget = document.querySelector(selector) as HTMLButtonElement;
        if (btnTarget) break;
      }

      // Si no encontramos con selectores específicos, buscar por texto
      if (!btnTarget) {
        const allButtons = Array.from(document.querySelectorAll('button'));
        btnTarget = allButtons.find(btn =>
          btn.textContent?.toLowerCase().includes('nueva venta')
        ) as HTMLButtonElement;
      }

      if (btnTarget) {
        // Hacer visible el botón (scroll) si es necesario
        btnTarget.scrollIntoView({ behavior: 'auto', block: 'center' });

        try {
          // Enfocar con opciones
          btnTarget.focus({ preventScroll: false });
          // Log eliminado

          // Efecto visual para resaltar el botón
          btnTarget.classList.add('focus-ring-pulse');
          setTimeout(() => btnTarget.classList.remove('focus-ring-pulse'), 2000);
        } catch (e) {
          console.error('Error al enfocar botón Nueva Venta:', e);
        }
      } else {
        console.warn('No se pudo encontrar el botón Nueva Venta en handleCloseInvoiceDialog');
      }
    };

    // Usar setTimeout para evitar conflictos con el cierre del modal
    setTimeout(() => {
      // Mostrar el modal de éxito en lugar del window.confirm
      setShowSaleSuccessDialog(true);

      // Estrategia de múltiples intentos con diferentes retrasos
      // Incluye retrasos más largos para asegurar que el diálogo esté completamente renderizado
      const delays = [100, 300, 500, 800, 1200, 2000];
      delays.forEach(delay => setTimeout(focusNuevaVentaBtn, delay));

      // Adicionalmente, agregar un MutationObserver para detectar cambios en el DOM
      // y asegurar que el botón reciba el foco cuando aparezca
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Si se agregaron nodos, intentar enfocar el botón
            setTimeout(focusNuevaVentaBtn, 50);
          }
        }
      });

      // Observar cambios en el body para detectar cuando se agrega el diálogo
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Dejar de observar después de un tiempo razonable
      setTimeout(() => observer.disconnect(), 3000);
    }, 100);
  }
  // Función para iniciar nueva venta directamente (sin mostrar opciones)
  const handleStartNewSale = () => {
    setIsInvoiceDialogOpen(false)
    setTimeout(() => {
      resetForNewSale()
    }, 100)
  }
  // Función para ver detalles de venta
  const handleViewSaleDetails = () => {
    setIsInvoiceDialogOpen(false)
    if (currentSale) {
      navigate(`/sales/${currentSale?.venta_id}`)
    }
  }

  // Función para manejar nueva venta desde el diálogo de éxito
  const handleNewSaleFromSuccess = () => {
    setShowSaleSuccessDialog(false)
    setTimeout(() => {
      resetForNewSale()
    }, 100)
  }
  // Función para ver detalles desde el diálogo de éxito
  const handleViewSaleDetailsFromSuccess = () => {
    setShowSaleSuccessDialog(false)
    if (currentSale) {
      navigate(`/sales/${currentSale?.venta_id}`)
    }
  }  // Función para mostrar ticket desde el diálogo de éxito
  const handleShowTicketFromSuccess = async () => {
    if (currentSale) {
      await printTicketDirectly(currentSale.venta_id)
    }
  }
  // ============================
  // FUNCIONES DE BÚSQUEDA Y ESCÁNER DE CÓDIGOS DE BARRAS
  // ============================
  // Función optimizada para búsqueda manual de códigos de barras
  const handleBarcodeSearch = async () => {
    if (!barcodeInput.trim()) {
      toast.error("Por favor ingrese un código de barras")
      return
    }

    if (isProcessingBarcode) return

    try {
      setIsProcessingBarcode(true)
      setIsBarcodeSearching(true)

      // Verificar si el código ya está en resultados
      const existingResult = barcodeSearchResults.find((item) => item.codigo_barras.codigo === barcodeInput.trim())

      if (existingResult) {
        setBarcodeSearchResult(existingResult)
        lastProductRef.current = existingResult

        // Agregar directamente al carrito
        await addProductDirectlyToCart(existingResult, precioMayoristaMode)

        // Cerrar el modal después de agregar
        setIsBarcodeDialogOpen(false)
        setBarcodeInput("")
        return
      }

      // Buscar producto por código de barras
      const result = await buscarProductoPorCodigoBarras(barcodeInput.trim())

      if (!result?.producto) {
        toast.error("No se encontró ningún producto con ese código de barras")
        setBarcodeSearchResult(null)
        return
      }

      // Procesar resultado exitoso y agregar al carrito
      setBarcodeSearchResult(result)
      lastProductRef.current = result

      // Agregar directamente al carrito
      await addProductDirectlyToCart(result, precioMayoristaMode)

      // Cerrar el modal después de agregar
      setIsBarcodeDialogOpen(false)
      setBarcodeInput("")

    } catch (error) {
      console.error("Error al buscar producto por código de barras:", error)
      toast.error("No se encontró ningún producto con ese código de barras")
      setBarcodeSearchResult(null)
    } finally {
      setIsBarcodeSearching(false)
      setTimeout(() => setIsProcessingBarcode(false), 300)
    }
  }
  // Función optimizada para manejar códigos escaneados
  const handleScannedBarcode = async (barcode: string, usarPrecioMayorista = false) => {
    if (isProcessingBarcode) {

      return
    }

    try {
      setIsProcessingBarcode(true)

      const trimmedBarcode = barcode.trim()


      // Toast más discreto para escaneo rápido
      toast.info(`Buscando: ${trimmedBarcode}`, {
        duration: 1000, // Más corto
        id: "barcode-scanning",
      })

      // Verificar cache de resultados
      const existingResult = barcodeSearchResults.find((item) => item.codigo_barras.codigo === trimmedBarcode)

      if (existingResult) {

        await addProductDirectlyToCart(existingResult, usarPrecioMayorista)
        return
      }

      // Buscar en API
      const result = await buscarProductoPorCodigoBarras(trimmedBarcode)

      if (!result?.producto) {
        toast.error(`No se encontró ningún producto con el código: ${trimmedBarcode}`, {
          id: "barcode-error",
        })
        return
      }


      await addProductDirectlyToCart(result, usarPrecioMayorista)
    } catch (error) {
      console.error("Error al buscar producto por código de barras:", error)
      toast.error(`No se encontró ningún producto con el código: ${barcode}`, {
        id: "barcode-error",
      })
    } finally {
      // Reducir tiempo de espera para permitir escaneo más rápido
      setTimeout(() => {
        setIsProcessingBarcode(false)

      }, 200) // Reducido de 500ms a 200ms para escaneo más rápido
    }
  }
  // Función para agregar producto directamente al carrito desde escaneo
  const addProductDirectlyToCart = async (result: any, usarPrecioMayorista: boolean) => {
    lastProductRef.current = result

    const productToAdd = products?.find((p) => p.id_producto === result.producto.id_producto)

    if (productToAdd) {
      // Verificar stock
      if (productToAdd.stock <= 0) {
        toast.error(`El producto ${result.producto.nombre} no tiene stock disponible`)
        return
      }

      // Verificar si el producto ya está siendo procesado para evitar duplicados rápidos
      // Reducir tiempo de cooldown para permitir escaneo rápido
      const now = Date.now()
      const lastAddKey = `${result.producto.id_producto}-${result.codigo_barras.codigo}`
      const lastAddTime = window.sessionStorage.getItem(`lastAdd-${lastAddKey}`)

      // Reducir cooldown a 300ms para permitir escaneo más rápido
      if (lastAddTime && now - parseInt(lastAddTime) < 300) {

        return
      }

      // Marcar como procesado
      window.sessionStorage.setItem(`lastAdd-${lastAddKey}`, now.toString())

      await addToCart(
        productToAdd,
        {
          codigo: result.codigo_barras.codigo,
          cantidad: result.codigo_barras.cantidad || 1,
        },
        usarPrecioMayorista || precioMayoristaMode,
      )

      // Toast más corto para escaneo rápido
      toast.success(`${result.producto.nombre} agregado`, {
        id: "barcode-success",
        duration: 1500, // Más corto para escaneo rápido
      })

      // Agregar a cache si no existe
      const existingIndex = barcodeSearchResults.findIndex((item) =>
        item.producto.id_producto === result.producto.id_producto &&
        item.codigo_barras.codigo === result.codigo_barras.codigo,
      )

      if (existingIndex === -1) {
        setBarcodeSearchResults((prev) => [...prev, result])
      }

      // Enfocar el buscador principal después de agregar el producto
      setTimeout(() => {
        if (productSearchInputRef.current) {
          productSearchInputRef.current.focus()
        }
      }, 200)
    } else {
      toast.warning("Producto encontrado pero no está disponible en el catálogo actual")
      // También enfocar el buscador en caso de error
      setTimeout(() => {
        if (productSearchInputRef.current) {
          productSearchInputRef.current.focus()
        }
      }, 200)
    }
  }

  // Función para abrir diálogo de escáner
  const openBarcodeScanner = () => {
    setIsBarcodeDialogOpen(true)
    setBarcodeInput("")
    setBarcodeSearchResult(null)
  }

  // ============================
  // FUNCIONES DE ACTUALIZACIÓN DE STOCK
  // ============================

  // Función para refrescar datos de stock de un item del carrito
  const refreshCartItemStock = async (item: CartItem) => {
    try {
      const response = await obtenerCodigosBarras(item.producto_id)

      if (response?.codigos_barras?.length > 0) {
        // Actualizar codigosMaximos con datos frescos del backend
        const updatedCodigosMaximos: Record<string, number> = {}

        for (const codigoBarras of response.codigos_barras) {
          if (item.codigos_barras.includes(codigoBarras.codigo)) {
            updatedCodigosMaximos[codigoBarras.codigo] = codigoBarras.cantidad
          }
        }

        return updatedCodigosMaximos
      }
    } catch (error) {
      console.error("Error al refrescar stock del producto:", error)
    }

    return item.codigosMaximos || {}
  }

  // Función para refrescar stock de todos los items del carrito
  const refreshAllCartItemsStock = async () => {
    if (cart.length === 0) return

    try {
      const updatedCart = [...cart]
      let hasUpdates = false

      for (let i = 0; i < updatedCart.length; i++) {
        const item = updatedCart[i]
        const freshCodigosMaximos = await refreshCartItemStock(item)

        // Solo actualizar si hay cambios
        if (JSON.stringify(freshCodigosMaximos) !== JSON.stringify(item.codigosMaximos)) {
          updatedCart[i] = { ...item, codigosMaximos: freshCodigosMaximos }
          hasUpdates = true
        }
      }

      if (hasUpdates) {
        setCart(updatedCart)
        toast.success("Stock actualizado con datos del inventario", { duration: 3000 })
      }
    } catch (error) {
      console.error("Error al refrescar stock del carrito:", error)
      toast.error("Error al actualizar el stock del carrito")
    }
  }

  // ============================
  // FUNCIONES DE MANEJO DE CARRITOS GUARDADOS
  // ============================

  // Función para guardar carrito actual
  const saveCurrentCart = () => {
    if (cart.length === 0) {
      toast.error("No hay productos en el carrito para guardar")
      return
    }
    setIsNamingCartDialogOpen(true)
  }

  // Función optimizada para confirmar guardado de carrito
  const confirmSaveCart = () => {
    const cartName = newCartName.trim() || `Cliente ${savedCarts.length + 1}`

    const newSavedCart: SavedCart = {
      id: moment().tz("America/Lima").valueOf().toString(),
      name: cartName,
      items: [...cart],
      metodoPago,
      observaciones,
      timestamp: moment().tz("America/Lima").valueOf(),
      barcodeSearchResults: [...barcodeSearchResults],
      tipoDocumento,
      clienteData,
    }

    setSavedCarts([...savedCarts, newSavedCart])

    // Limpiar estado actual
    clearCurrentCartState()

    setIsNamingCartDialogOpen(false)
    setNewCartName("")
    toast.success(`Carrito "${cartName}" guardado correctamente`)
  }

  // Función auxiliar para limpiar estado del carrito actual
  const clearCurrentCartState = () => {
    setCart([])
    saleIdempotencyKey.current = crypto.randomUUID()
    setMetodoPago("efectivo")
    setObservaciones("")
    setBarcodeSearchResults([])
    setTipoDocumento("")
    setClienteData(null)
    setYapeCelular("")
    setYapeCodigo("")
    setPlinCelular("")
    setPlinCodigo("")
    setMontoRecibido("")
  }

  // Función optimizada para cargar carrito guardado
  const loadSavedCart = (savedCart: SavedCart) => {
    // Confirmar si hay carrito actual
    if (cart.length > 0) {
      if (window.confirm("¿Desea guardar el carrito actual antes de cargar otro?")) {
        saveCurrentCart()
        return
      }
    }

    // Cargar datos del carrito
    setCart(savedCart.items)
    setMetodoPago(savedCart.metodoPago)
    setObservaciones(savedCart.observaciones)

    // Cargar datos adicionales si existen
    if (savedCart.tipoDocumento) {
      setTipoDocumento(savedCart.tipoDocumento)
    }

    if (savedCart.clienteData) {
      setClienteData(savedCart.clienteData)
    }

    // NO cargar catálogo de productos obsoleto
    // Los barcodeSearchResults se mantienen vacíos para forzar búsquedas actualizadas
    setBarcodeSearchResults([])
    // Si había productos en el catálogo, informar al usuario
    if (savedCart.barcodeSearchResults?.length > 0) {
      toast.info("Carrito cargado. El catálogo se actualizará con las búsquedas.")
    }

    // Eliminar carrito guardado y cerrar diálogo
    setSavedCarts(savedCarts.filter((c) => c.id !== savedCart.id))
    setIsSavedCartsDialogOpen(false)
    toast.success(`Carrito "${savedCart.name}" cargado correctamente`)

    // Marcar que se necesita refrescar el stock después de cargar
    setNeedsStockRefresh(true)
  }

  // Función para eliminar carrito guardado
  const deleteSavedCart = (id: string, name: string) => {
    if (window.confirm(`¿Está seguro de eliminar el carrito "${name}"?`)) {
      setSavedCarts(savedCarts.filter((c) => c.id !== id))
      toast.info(`Carrito "${name}" eliminado`)
    }
  }

  // Función para iniciar nuevo carrito
  const startNewCart = () => {
    if (cart.length > 0) {
      if (window.confirm("¿Desea guardar el carrito actual antes de crear uno nuevo?")) {
        saveCurrentCart()
        return
      }
    } clearCurrentCartState()
    toast.info("Nuevo carrito iniciado")
  }

  // ============================
  // FUNCIONES AUXILIARES DE UI
  // ============================

  // Modificar la función para cambiar el tipo de precio de un ítem en el carrito
  const toggleItemPriceType = (index: number) => {
    const updatedCart = [...cart]
    const item = updatedCart[index]

    // Verificar si el producto tiene precio mayorista
    if (!item.precio_mayoritario || item.precio_mayoritario === "0.00") {
      toast.warning(`Este producto no tiene precio mayorista definido`)
      return
    }

    // Cambiar el tipo de precio
    item.esPrecioMayorista = !item.esPrecioMayorista

    // Actualizar el precio según el tipo
    if (item.esPrecioMayorista) {
      // Cambiar a precio mayorista (no aplica oferta)
      item.precio_unitario = item.precio_mayoritario!
      item.precio_unitario_con_igv = item.precio_mayoritario_con_igv!
      item.es_oferta = false
    } else {
      // Cambiar a precio unitario, verificar si aplica oferta
      const originalProduct = products?.find((p) => p.id_producto === item.producto_id)
      if (originalProduct) {
        if (originalProduct.es_oferta && originalProduct.precio_oferta && originalProduct.precio_oferta !== "0.00") {
          // Aplicar precio de oferta
          item.precio_unitario = originalProduct.precio_oferta
          item.precio_unitario_con_igv =
            originalProduct.precio_oferta_con_igv ||
            (Number.parseFloat(originalProduct.precio_oferta) * 1.18).toFixed(2)
          item.es_oferta = true
        } else {
          // Precio normal
          item.precio_unitario = originalProduct.precio_unitario
          item.precio_unitario_con_igv = originalProduct.precio_unitario_con_igv
          item.es_oferta = false
        }
      }
    }

    // Recalcular el subtotal del ítem
    item.subtotal = Number.parseFloat(item.precio_unitario_con_igv) * item.cantidad

    // Actualizar el carrito
    setCart(updatedCart)

    let tipoPrecionMensaje = item.esPrecioMayorista ? "mayorista" : "unitario"
    if (!item.esPrecioMayorista && item.es_oferta) {
      tipoPrecionMensaje = "oferta"
    }

    toast.success(`Precio cambiado a ${tipoPrecionMensaje} para ${item.nombre}`)
  }

  // Función inteligente para manejar búsqueda por nombre o código de barras escaneado
  const handleSearchOrBarcode = async (searchValue: string) => {
    // Prevenir procesamiento si ya se está procesando un código de barras
    if (isProcessingBarcode) {

      return
    }

    // Detectar si parece ser un código de barras escaneado (alfanumérico, sin espacios, longitud típica)
    const isLikelyBarcode = /^[a-zA-Z0-9]+$/.test(searchValue) && searchValue.length >= 6

    if (isLikelyBarcode) {
      // Tratar como código de barras - buscar producto y agregar directamente al carrito
      try {

        await handleScannedBarcode(searchValue)
        setProductSearchTerm('')
        setIsProductSearchOpen(false)
      } catch (error) {
        // Si falla como código de barras, intentar búsqueda normal

        performNormalSearch(searchValue)
      }
    } else {
      // Tratar como búsqueda de texto normal

      performNormalSearch(searchValue)
    }
  }

  // Función auxiliar para realizar búsqueda normal y seleccionar primer resultado
  const performNormalSearch = async (searchValue: string) => {
    await searchProducts(searchValue)

    // Si hay resultados, seleccionar automáticamente el primero
    if (productSearchResults.length > 0) {
      const firstResult = productSearchResults[0]
      await addProductFromSearch(firstResult)
    } else {
      toast.info(`No se encontraron productos que coincidan con "${searchValue}"`)
      setProductSearchTerm('')
      setIsProductSearchOpen(false)
      // Mantener el foco en el buscador incluso cuando no hay resultados
      setTimeout(() => {
        if (productSearchInputRef.current) {
          productSearchInputRef.current.focus()
        }
      }, 150)
    }
  }  // Función para imprimir ticket directamente en impresora térmica
  const printTicketDirectly = async (ventaId: number) => {
    try {
      const result = await generateSaleTicket(ventaId)
      setTicketHtml(result.html)
      setIsTicketModalOpen(true)
      // Ya no imprimas directo aquí, deja que el usuario lo haga desde el modal
    } catch (error: any) {
      console.error("Error al generar e imprimir ticket:", error)
      toast.error("Error al generar el ticket para impresión")
    }
  }

  // ============================
  // REDISEÑO POS: ayudantes de presentación (la lógica de venta no cambia)
  // ============================
  const isMobile = viewportW < 1180
  const isCompact = viewportW < 1440
  const payable = saleDiscount.isDiscount ? totalWithDiscount : total
  const recibidoNum = Number.parseFloat(montoRecibido)
  const cashShort = metodoPago === "efectivo" && montoRecibido !== "" && !Number.isNaN(recibidoNum) && recibidoNum < payable
  const blockReason =
    cart.length === 0 ? "Agrega un producto para cobrar"
      : tipoDocumento === "01" && !clienteData ? "Falta consultar el RUC"
        : cashShort ? "Monto recibido menor al total"
          : canalExterno && !posPredeterminado ? "Crisitus debe configurar un POS predeterminado"
            : canalExterno && !posNumeroOperacion.trim() ? "Falta el número de operación"
              : ""
  const comprobanteLabel = tipoDocumento === "01" ? "Factura" : tipoDocumento === "03" ? "Boleta" : "Nota de venta"
  const focusSearch = () => setTimeout(() => productSearchInputRef.current?.focus(), 100)

  const changeTipoDocumento = (value: string) => {
    setTipoDocumento(value)
    if (value === "") {
      limpiarDatosCliente()
    } else if (value !== "01" && clienteData && clienteData.tipoDocumento === "6") {
      limpiarDatosCliente()
    }
  }

  const setVariablePrice = (index: number, value: string) => {
    if (!/^\d*(\.\d{0,2})?$/.test(value)) return
    const n = Number(value) || 0
    setCart(prev => prev.map((it, i) => i !== index ? it : {
      ...it,
      precio_unitario_con_igv: value,
      precio_unitario: (n / 1.18).toFixed(2),
      precioVariableConIgv: value,
      precioVariable: (n / 1.18).toFixed(2),
      subtotal: n * it.cantidad,
    }))
  }

  const commitVariablePrice = (index: number) => {
    if (Number(cart[index]?.precio_unitario_con_igv) < 0.5) setVariablePrice(index, "0.50")
    productSearchInputRef.current?.focus()
  }

  const addCash = (amount: number) => setMontoRecibido(((Number.isNaN(recibidoNum) ? 0 : recibidoNum) + amount).toFixed(2))

  const renderLine = (item: CartItem, index: number, two: boolean) => {
    const av = getCartItemAvailabilityInfo(item)
    const left = av.totalAvailable - item.cantidad
    const img = item.imagen_url ? getProductImageUrl(item) : null
    const hasMay = !!item.precio_mayoritario && item.precio_mayoritario !== "0.00"
    const tag = item.esPrecioVariable ? "Variable" : item.esPrecioMayorista ? "Mayorista" : item.es_oferta ? "Oferta" : "Unitario"
    return (
      <div key={`${item.producto_id}-${index}`} className={`ln${two ? " two" : ""}${left < 0 ? " err" : ""}`}>
        {img ? (
          <button type="button" className="th" aria-label={`Ver imagen de ${item.nombre}`} onClick={() => openCartImageView(img)}>
            <img src={img} alt="" loading="lazy" />
          </button>
        ) : (
          <span className="th">{I(Package, 20)}</span>
        )}
        <div className="nm">
          <div className="n1">{item.nombre}</div>
          <div className="n2">
            {left <= 0
              ? <span className="tx-wrn" style={{ fontWeight: 600 }}>{I(AlertTriangle, 13)}{left < 0 ? "Stock insuficiente" : "Sin más stock"}</span>
              : left <= 3
                ? <span className="tx-wrn" style={{ fontWeight: 600 }}>{I(AlertTriangle, 13)}Quedan {left}</span>
                : <span>Quedan {left}</span>}
            {av.totalReservedInOtherCarts > 0 && <span>{av.totalReservedInOtherCarts} reservadas en otro carrito</span>}
          </div>
        </div>
        <div className="stp" role="group" aria-label={`Cantidad de ${item.nombre}`}>
          <button type="button" aria-label="Quitar una unidad" disabled={item.cantidad <= 1} onClick={() => updateCartItemQuantity(index, Math.max(1, item.cantidad - 1))}>{I(Minus, 16)}</button>
          <input
            type="number" min={1} max={av.totalAvailable} inputMode="numeric" value={item.cantidad}
            aria-label={`Cantidad de ${item.nombre}`}
            onChange={e => updateCartItemQuantity(index, Math.max(1, Number.parseInt(e.target.value) || 1))}
          />
          <button type="button" aria-label="Agregar una unidad" disabled={!av.canIncrease} onClick={() => updateCartItemQuantity(index, item.cantidad + 1)}>{I(Plus, 16)}</button>
        </div>
        {item.esPrecioVariable ? (
          <label className="fld pfld">
            <span className="pre">S/</span>
            <input
              type="number" min="0.50" step="0.50" inputMode="decimal" value={item.precio_unitario_con_igv}
              aria-label={`Precio variable de ${item.nombre}`}
              onChange={e => setVariablePrice(index, e.target.value)}
              onBlur={() => commitVariablePrice(index)}
              onWheel={e => e.currentTarget.blur()}
            />
          </label>
        ) : (
          <div className="pr">
            <span className="p1">{formatCurrency(Number.parseFloat(item.precio_unitario_con_igv))}</span>
            <span className="p2">{tag}</span>
          </div>
        )}
        <div className="sub">{formatCurrency(item.subtotal)}</div>
        <div className="rm">
          {canModifyPrice() && (
            <button type="button" className={`btn txt sq${item.esPrecioVariable ? " on" : ""}`} aria-pressed={!!item.esPrecioVariable}
              aria-label={item.esPrecioVariable ? "Volver al precio original" : "Fijar precio variable"} title={item.esPrecioVariable ? "Volver al precio original" : "Fijar precio variable"}
              onClick={() => toggleItemVariablePrice(index)}>{I(Pencil, 18)}</button>
          )}
          {hasMay && !item.esPrecioVariable && (
            <button type="button" className={`btn txt sq${item.esPrecioMayorista ? " on" : ""}`} aria-pressed={!!item.esPrecioMayorista}
              aria-label={`Cambiar a precio ${item.esPrecioMayorista ? "unitario" : "mayorista"}`} title={`Cambiar a precio ${item.esPrecioMayorista ? "unitario" : "mayorista"}`}
              onClick={() => toggleItemPriceType(index)}><b aria-hidden="true">S/</b></button>
          )}
          <button type="button" className="btn txt sq" aria-label={`Quitar ${item.nombre}`} title="Quitar producto" onClick={() => removeFromCart(index)}>{I(Trash2, 18)}</button>
        </div>
      </div>
    )
  }

  const renderCapture = () => (
    <div className="cap" ref={productSearchRef}>
      <label className="cbox foc">
        {I(Barcode, 22)}
        <input
          ref={productSearchInputRef}
          type="text"
          autoComplete="off"
          aria-label="Escanear código de barras o buscar producto"
          placeholder={isMobile ? "Escanea o busca un producto" : "Escanea un producto o búscalo por nombre o código"}
          value={productSearchTerm}
          onChange={e => { setProductSearchTerm(e.target.value); searchProducts(e.target.value) }}
          onFocus={() => { if (productSearchTerm.trim()) setIsProductSearchOpen(true) }}
          onKeyDown={e => {
            if (e.key === "Enter" && productSearchTerm.trim()) {
              e.preventDefault()
              if (productSearchResults.length > 0) addProductFromSearch(productSearchResults[0])
              else handleSearchOrBarcode(productSearchTerm.trim())
            } else if ((e.key === "ArrowDown" || e.key === "Tab") && productSearchResults.length > 0) {
              e.preventDefault()
              ;(document.querySelector('[data-product-result="0"]') as HTMLElement | null)?.focus()
            }
          }}
        />
        {isLoadingProductSearch && <Loader2 className="animate-spin" size={18} aria-label="Buscando" />}
      </label>
      <CameraCodeScanner label="" onDetected={code => handleScannedBarcode(code, precioMayoristaMode)} className="btn out sq cam" />
      <button type="button" className="btn out sq" aria-label="Escáner manual" title="Escáner manual" onClick={openBarcodeScanner}>{I(ScanLine, 20)}</button>
      {!isMobile && (
        <button type="button" role="switch" aria-checked={isBarcodeScannerActive} className={`sw${isBarcodeScannerActive ? "" : " off"}`}
          onClick={() => setIsBarcodeScannerActive(!isBarcodeScannerActive)}><i />Escáner</button>
      )}
      {isProductSearchOpen && productSearchResults.length > 0 && (
        <div className="menu" role="listbox" aria-label="Resultados de la búsqueda">
          <div className="mh">{productSearchResults.length} resultado{productSearchResults.length !== 1 ? "s" : ""} · Enter agrega el primero</div>
          {productSearchResults.map((product, index) => {
            const stock = Number(product.stock) || 0
            const url = getProductImageUrl(product)
            return (
              <button
                type="button" key={product.id_producto} role="option" aria-selected={index === 0}
                className={`res${index === 0 ? " sel" : ""}${stock <= 0 ? " na" : ""}`}
                data-product-result={index}
                onClick={() => addProductFromSearch(product)}
                onKeyDown={e => {
                  const go = (i: number) => (document.querySelector(`[data-product-result="${i}"]`) as HTMLElement | null)
                  if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
                    e.preventDefault(); (go(index + 1) ?? productSearchInputRef.current)?.focus()
                  } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
                    e.preventDefault(); (index === 0 ? productSearchInputRef.current : go(index - 1))?.focus()
                  }
                }}
              >
                <span className="th">{url ? <img src={url} alt="" loading="lazy" /> : I(Package, 20)}</span>
                <span>
                  <span className="n1" style={{ display: "block" }}>{product.nombre}</span>
                  <span className="n2">
                    <span className="num">{product.sku || "Sin código"}</span>
                    {product.es_oferta && <span className="tag">Oferta</span>}
                    {precioMayoristaMode && product.precio_mayoritario && product.precio_mayoritario !== "0.00" && <span className="tag">Mayorista</span>}
                    {stock <= 0
                      ? <span className="tx-bad" style={{ fontWeight: 600 }}>{I(CircleAlert, 13)}Agotado</span>
                      : stock <= 3
                        ? <span className="tx-wrn" style={{ fontWeight: 600 }}>{I(AlertTriangle, 13)}Quedan {stock}</span>
                        : <span>{stock} disponibles</span>}
                  </span>
                </span>
                <span className="pz num">{getDisplayPrice(product)}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderList = () => (
    <section className="lst card" aria-label="Productos de la venta">
      <div className="lh">
        {!isMobile && (
          <>
            <b>Productos</b>
            <span className="tx-mu num" style={{ fontSize: 13 }}>{cart.length} {cart.length === 1 ? "línea" : "líneas"} · {totalItems} {totalItems === 1 ? "unidad" : "unidades"}</span>
          </>
        )}
        <div className="r" style={isMobile ? { width: "100%" } : undefined}>
          <div className={`seg ${isMobile ? "" : "sm"}`} role="group" aria-label="Modo de precio" style={isMobile ? { flex: 1 } : undefined}>
            <button type="button" className={precioMayoristaMode ? "" : "on"} aria-pressed={!precioMayoristaMode} onClick={() => setPrecioMayoristaMode(false)}>Unitario</button>
            <button type="button" className={precioMayoristaMode ? "on" : ""} aria-pressed={precioMayoristaMode} aria-keyshortcuts="Alt+Shift+M" onClick={() => setPrecioMayoristaMode(true)}>Mayorista</button>
          </div>
          {isMobile || isCompact ? (
            <>
              <button type="button" className="btn txt sq" aria-label="Actualizar stock" disabled={cart.length === 0} onClick={refreshAllCartItemsStock}>{I(RefreshCw, 18)}</button>
              <button type="button" className="btn txt sq" aria-label="Reiniciar venta" onClick={() => { startNewCart(); focusSearch() }}>{I(RotateCcw, 18)}</button>
            </>
          ) : (
            <>
              <button type="button" className="btn txt" disabled={cart.length === 0} onClick={refreshAllCartItemsStock}>{I(RefreshCw, 16)}Actualizar stock</button>
              <button type="button" className="btn txt" onClick={() => { startNewCart(); focusSearch() }}>{I(RotateCcw, 16)}Reiniciar</button>
            </>
          )}
        </div>
      </div>
      {cart.length > 0 ? (
        <div className="rows">{cart.map((item, index) => renderLine(item, index, isMobile || isCompact))}</div>
      ) : (
        <div className="empty">
          {I(ScanLine, 40)}
          <b>Escanea un producto o búscalo por nombre</b>
          <span>Enter agrega la línea. El lector USB funciona sin hacer clic.</span>
        </div>
      )}
    </section>
  )

  const renderCobro = () => {
    const metodos: [string, string, LucideIcon][] = [
      ["efectivo", "Efectivo", Banknote], ["tarjeta", "Tarjeta", CreditCard], ["transferencia", "Transfer.", Landmark],
      ["yape", "Yape", QrCode], ["plin", "Plin", QrCode], ["pago_link", "Link", Link2],
    ]
    const nombreCliente = clienteData
      ? (tipoDocumento === "01" ? clienteData.razonSocial : `${clienteData.nombres} ${clienteData.apellidoPaterno} ${clienteData.apellidoMaterno}`)
      : ""
    const vuelto = montoRecibido !== "" && !Number.isNaN(recibidoNum) && recibidoNum >= payable ? calcularVuelto() : 0
    const tot = (
      <div className="tot">
        <div className="tl">Total a cobrar</div>
        <div className="tr">
          <span className="big">{formatCurrency(payable)}</span>
          {canApplyDiscount() && (
            <button type="button" className="btn out" aria-keyshortcuts="Control+D" disabled={cart.length === 0} onClick={openDiscountDialog}>{I(Percent, 16)}Descuento</button>
          )}
        </div>
        <div className="dsg">
          <div>Subtotal<b>{formatCurrency(subtotal)}</b></div>
          <div>IGV 18 %<b>{formatCurrency(igv)}</b></div>
          <div>Descuento<b className={saleDiscount.isDiscount ? "tx-ok" : ""}>{saleDiscount.isDiscount ? `−${formatCurrency(saleDiscount.amount)}` : "—"}</b></div>
        </div>
        {canApplyDiscount() && cart.length > 0 && (
          <div className="qd">
            <button type="button" className="btn out" onClick={applyQuickDiscount1Sol}>S/ −1</button>
            <button type="button" className="btn out" onClick={applyQuickDiscount2Soles}>S/ −2</button>
            {saleDiscount.isDiscount && <button type="button" className="btn txt" onClick={removeDiscount}>{I(X, 16)}Quitar descuento</button>}
          </div>
        )}
      </div>
    )
    const comp = (
      <div>
        <div className="lb">Comprobante</div>
        <div className="seg" role="group" aria-label="Tipo de comprobante">
          {([["", "Nota"], ["03", "Boleta"], ["01", "Factura"]] as const).map(([v, l], i) => (
            <button type="button" key={v} className={tipoDocumento === v ? "on" : ""} aria-pressed={tipoDocumento === v}
              aria-keyshortcuts={`Alt+Shift+${i + 1}`} onClick={() => changeTipoDocumento(v)}>{l}</button>
          ))}
        </div>
      </div>
    )
    const cli = tipoDocumento === "" ? null : (
      <div>
        <div className="lb">{tipoDocumento === "01" ? "Empresa" : "Cliente"}</div>
        {clienteData ? (
          <div className="cli ok">
            {I(tipoDocumento === "01" ? Building2 : User, 18)}
            <div className="t"><b>{nombreCliente}</b><span className="num">{tipoDocumento === "01" ? "RUC" : "DNI"} {clienteData.numeroDocumento}</span></div>
            <button type="button" className="btn txt sq" aria-label="Cambiar cliente" onClick={() => setIsClienteDialogOpen(true)}>{I(Pencil, 16)}</button>
            <button type="button" className="btn txt sq" aria-label="Quitar cliente" onClick={limpiarDatosCliente}>{I(X, 16)}</button>
          </div>
        ) : (
          <button type="button" className="btn out cli-find" onClick={() => setIsClienteDialogOpen(true)}>
            {I(Search, 16)}{tipoDocumento === "01" ? "Consultar RUC (obligatorio)" : "Consultar DNI (opcional)"}
          </button>
        )}
      </div>
    )
    const pm = (
      <div>
        <div className="lb">Método de pago</div>
        <div className="pm" role="group" aria-label="Método de pago">
          {metodos.map(([id, l, Icon]) => (
            <button type="button" key={id} className={metodoPago === id ? "on" : ""} aria-pressed={metodoPago === id} onClick={() => setMetodoPago(id)}>{I(Icon, 16)}{l}</button>
          ))}
        </div>
      </div>
    )
    let blk: ReactNode = null
    if (metodoPago === "efectivo") {
      blk = (
        <div>
          <div className="cash">
            <label className="fld"><span className="pre">S/</span>
              <input type="number" inputMode="decimal" min="0" step="0.10" placeholder={payable.toFixed(2)} value={montoRecibido}
                aria-label="Monto recibido" onChange={e => setMontoRecibido(e.target.value)} onWheel={e => e.currentTarget.blur()} /></label>
            <button type="button" className="btn out" style={{ padding: "0 10px" }} onClick={() => setMontoRecibido(payable.toFixed(2))}>Exacto</button>
            <div className="vue" role="status"><span>{cashShort ? "Falta" : "Vuelto"}</span><b>{cashShort ? formatCurrency(payable - recibidoNum) : formatCurrency(vuelto)}</b></div>
          </div>
          <div className="bill" role="group" aria-label="Sumar billetes y monedas">
            {[200, 100, 50, 20, 10, 5, 2, 1].map(b => (
              <button type="button" key={b} aria-label={`Sumar S/ ${b}`} onClick={() => addCash(b)}>{b}</button>
            ))}
          </div>
        </div>
      )
    } else if (metodoPago === "transferencia") {
      blk = <div className="hint tx-mu" style={{ margin: 0 }}>{I(CircleCheck, 14)}Transferencia no pide datos de operación.</div>
    } else if (canalExterno) {
      blk = (
        <div className="ext">
          <div className="acq">{I(CreditCard, 14)}{posPredeterminado ? `${posPredeterminado.nombre}${posPredeterminado.marca ? ` · ${posPredeterminado.marca}` : ""}` : "Sin POS configurado por Crisitus"} · canal {canalExterno === "pos" ? "terminal" : canalExterno === "qr" ? "QR" : "link"}</div>
          {canalExterno === "link" && posPredeterminado?.link_pago_url && (
            <a className="btn out" href={posPredeterminado.link_pago_url} target="_blank" rel="noreferrer">Abrir link configurado</a>
          )}
          <label className="fld">{I(Receipt, 16)}
            <input value={posNumeroOperacion} maxLength={80} aria-label="Número de operación"
              placeholder={canalExterno === "pos" ? "N.º de operación del voucher (obligatorio)" : canalExterno === "qr" ? "Código de operación QR (obligatorio)" : "Referencia del pago por link (obligatorio)"}
              onChange={e => setPosNumeroOperacion(e.target.value.toUpperCase())} /></label>
          <div className="hint tx-mu" style={{ margin: 0 }}>Cobra primero en el terminal. No ingreses el número completo de la tarjeta ni el CVV.</div>
        </div>
      )
    }
    const note = (
      <div>
        <div className="lb">Observaciones</div>
        <label className="fld">{I(StickyNote, 16)}
          <input value={observaciones} placeholder="Agregar nota (opcional)" aria-label="Observaciones" onChange={e => setObservaciones(e.target.value)} /></label>
      </div>
    )
    const ft = (
      <div className="ft">
        <div className="row">
          <button type="button" className={`btn l ${blockReason || createSaleMutation.isPending ? "dis" : "pri"}`}
            disabled={!!blockReason || createSaleMutation.isPending}
            aria-describedby="pos-why" onClick={handleSubmit}>
            {createSaleMutation.isPending ? <><Loader2 className="animate-spin" size={18} />Procesando…</> : blockReason ? "Cobrar" : `Cobrar ${formatCurrency(payable)}`}
          </button>
        </div>
        <div id="pos-why" role="status" className={`why${blockReason ? " bad" : ""}`}>
          {blockReason ? <>{I(CircleAlert, 14)}{blockReason}</> : <>{I(CircleCheck, 14)}{comprobanteLabel} · <span style={{ textTransform: "capitalize" }}>{metodoPago.replace("_", " ")}</span></>}
        </div>
      </div>
    )
    return { tot, comp, cli, pm, blk, note, ft }
  }


  // ============================
  // RENDERIZADO PRINCIPAL
  // ============================

  return (
    <div className="pg-pos">
      {(() => {
        const c = renderCobro()
        return (
          <div className={`pos${isMobile || isCompact ? " two" : ""}${isCompact ? " compact" : ""}`}>
            <div className="hd">
              <h1>Nueva venta</h1>
              {!isMobile && (
                <>
                  <span className={`chp ${isBarcodeScannerActive ? (isScanning ? "ok" : "ok") : "mu"}`}>
                    {I(ScanLine, 14)}{isScanning ? `¡Código escaneado! ${scannedBarcode}` : isBarcodeScannerActive ? "Escáner activo" : "Escáner pausado"}
                  </span>
                  {!isCompact && <span className="chp mu">{I(Clock, 14)}{dateTimeLima(new Date(nowTick).toISOString())}</span>}
                </>
              )}
              <div className="r">
                <button type="button" className={`btn out${isMobile ? " sq" : ""}`} aria-label="Guardar carrito" disabled={cart.length === 0} onClick={saveCurrentCart}>{I(PauseCircle, isMobile ? 18 : 16)}{!isMobile && "Guardar"}</button>
                <button type="button" className={`btn out${isMobile ? " sq" : ""}`} aria-label={`Carritos guardados (${savedCarts.length})`} disabled={savedCarts.length === 0} onClick={() => setIsSavedCartsDialogOpen(true)}>{I(Bookmark, isMobile ? 18 : 16)}{!isMobile && `Carritos guardados (${savedCarts.length})`}</button>
                <button type="button" className={`btn out${isMobile ? " sq" : ""}`} aria-label="Nuevo carrito" onClick={() => { startNewCart(); focusSearch() }}>{I(FilePlus, isMobile ? 18 : 16)}{!isMobile && "Nuevo"}</button>
                <button type="button" className={`btn out${isMobile ? " sq" : ""}`} aria-label="Atajos de teclado" onClick={() => setIsShortcutsDialogOpen(true)}>{I(Keyboard, isMobile ? 18 : 16)}{!isMobile && "Atajos"}</button>
              </div>
            </div>

            {isMobile ? (
              <>
                {renderCapture()}
                {renderList()}
                <div className="bar">
                  <div className="t"><span>{cart.length} {cart.length === 1 ? "ítem" : "ítems"} · Total</span><b>{formatCurrency(payable)}</b></div>
                  <button type="button" className="btn pri l" disabled={cart.length === 0} onClick={() => setCobroOpen(true)}>Cobrar</button>
                </div>
                {cobroOpen && (
                  <div className="sheet" role="dialog" aria-modal="true" aria-label="Cobro">
                    <div className="sh">
                      <button type="button" className="btn txt sq" aria-label="Volver al carrito" onClick={() => setCobroOpen(false)}>{I(ChevronLeft, 22)}</button>
                      <h2>Cobro</h2>
                    </div>
                    <div className="sb">{c.tot}<hr />{c.comp}{c.cli}{c.pm}{c.blk}{c.note}</div>
                    {c.ft}
                  </div>
                )}
              </>
            ) : (
              <div className="body">
                <div className="lf">{renderCapture()}{renderList()}</div>
                <aside className="rt card" aria-label="Cobro">
                  <div className="mid">{c.tot}<hr />{c.comp}{c.cli}{c.pm}{c.blk}{c.note}</div>
                  {c.ft}
                </aside>
              </div>
            )}
          </div>
        )
      })()}

      {/* Diálogos y modales */}
      <ShortcutsDialog
        isOpen={isShortcutsDialogOpen}
        onClose={() => setIsShortcutsDialogOpen(false)}
      />

      <TicketViewer
        isOpen={isTicketModalOpen}
        onClose={() => {
          setIsTicketModalOpen(false)
          if (showSaleSuccessAfterTicket) {
            setShowSaleSuccessDialog(true)
            setShowSaleSuccessAfterTicket(false)
          }
        }}
        htmlContent={ticketHtml}
        pdfBlob={pdfBlob}
        title={tipoDocumento === "01" ? "Factura Electrónica" : tipoDocumento === "03" ? "Boleta Electrónica" : "Nota de venta"}
        documentType={tipoDocumento === "01" ? "Factura Electrónica" : tipoDocumento === "03" ? "Boleta Electrónica" : "Nota de venta"}
        fileName={`documento-${Date.now()}`}
      />


      <SunatAlertDialog
        isOpen={showSunatAlert}
        onClose={() => setShowSunatAlert(false)}
        tipoDocumento={tipoDocumento}
        pendingSaleData={pendingSaleData}
        onConfirm={handleSendToSunat}
        onDirectSave={(data) => createSaleMutation.mutate(data)}
      />

      <InvoiceDialog
        isOpen={isInvoiceDialogOpen}
        onClose={handleCloseInvoiceDialog}
        tipoDocumento={tipoDocumento}
        isInvoiceSending={isInvoiceSending}
        invoiceResult={invoiceResult}
        onNewSale={handleStartNewSale}
        onViewDetails={handleViewSaleDetails}
      />

      <ClienteDialog
        isOpen={isClienteDialogOpen}
        onClose={() => setIsClienteDialogOpen(false)}
        tipoDocumento={tipoDocumento}
        documentoCliente={documentoCliente}
        setDocumentoCliente={setDocumentoCliente}
        isConsultandoCliente={isConsultandoCliente}
        setIsConsultandoCliente={setIsConsultandoCliente}
        clienteData={clienteData}
        setClienteData={setClienteData}
        onConsultar={consultarCliente}
        onLimpiar={limpiarDatosCliente}
      />

      <BarcodeScannerDialog
        isOpen={isBarcodeDialogOpen}
        onClose={() => setIsBarcodeDialogOpen(false)}
        barcodeInput={barcodeInput}
        setBarcodeInput={setBarcodeInput}
        isBarcodeSearching={isBarcodeSearching}
        barcodeSearchResult={barcodeSearchResult}
        onSearch={handleBarcodeSearch}
        onAddToCart={(product, barcodeData) => {
          const productToAdd = products?.find((p) => p.id_producto === product.id_producto)
          if (productToAdd) {
            addToCart(productToAdd, barcodeData, precioMayoristaMode)
          }
        }}
        isProcessingBarcode={isProcessingBarcode}
      />

      <CartNamingDialog
        isOpen={isNamingCartDialogOpen}
        onClose={() => setIsNamingCartDialogOpen(false)}
        cartName={newCartName}
        setCartName={setNewCartName}
        savedCartsLength={savedCarts.length}
        onConfirm={confirmSaveCart}
      />

      <DiscountDialog
        isOpen={isDiscountDialogOpen}
        onClose={() => {
          setIsDiscountDialogOpen(false)
          setDiscountValue("")
        }}
        discountType={discountType}
        setDiscountType={setDiscountType}
        discountValue={discountValue}
        setDiscountValue={setDiscountValue}
        onApply={applyDiscount}
        total={total}
        cart={cart}
        canApplyDiscount={canApplyDiscount}
      />

      <SavedCartsDialog
        isOpen={isSavedCartsDialogOpen}
        onClose={() => setIsSavedCartsDialogOpen(false)}
        savedCarts={savedCarts}
        onLoadCart={loadSavedCart}
        onDeleteCart={deleteSavedCart}
      />

      <BarcodeSelectionDialog
        isOpen={isBarcodeSelectionDialogOpen}
        onClose={() => {
          setIsBarcodeSelectionDialogOpen(false)
          setSelectedProductForBarcode(null)
          setAvailableBarcodes([])
        }}
        selectedProductForBarcode={selectedProductForBarcode}
        availableBarcodes={availableBarcodes}
        isLoadingBarcodesSelection={isLoadingBarcodesSelection}
        onSelectBarcode={selectBarcode}
      />

      <Dialog open={isCartImageViewOpen} onOpenChange={setIsCartImageViewOpen}>
        <DialogContent className="max-w-md mx-auto bg-white dark:bg-gray-900 shadow-xl">
          <img
            src={selectedCartImageUrl}
            alt="Imagen del producto"
            className="w-full h-auto rounded-lg"
          />
        </DialogContent>
      </Dialog>

      <SaleSuccessDialog
        isOpen={showSaleSuccessDialog}
        onClose={() => setShowSaleSuccessDialog(false)}
        onNewSale={handleNewSaleFromSuccess}
        onViewDetails={handleViewSaleDetailsFromSuccess}
        onShowTicket={handleShowTicketFromSuccess}
        saleId={currentSale?.venta_id || ""}
        tipoDocumento={tipoDocumento} />
    </div>
  )
}

export default NewSalePage
