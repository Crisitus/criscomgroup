import React from "react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "../components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import { Badge } from "../components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { VisuallyHidden } from "../components/ui/visually-hidden"
import { 
  Search, 
  Loader2, 
  User, 
  Building, 
  Percent, 
  DollarSign, 
  Keyboard,
  Scan,
  ShoppingCart,
  CreditCard,
  Smartphone,
  Banknote,
  MonitorSpeaker,
  Clock,
  Trash2,
  X,
  UserCircle,
  PauseCircle,
  ListOrdered,
  FileCheck,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,  ChevronRight,
  Plus,
  Eye,
} from "lucide-react"
import { formatCurrency } from "../lib/utils"
import { type ClienteConsultaResponse } from "../services/invoiceService"

// Types
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
  esPrecioMayorista: boolean
  codigosMaximos?: Record<string, number>
}

interface ShortcutItem {
  keys: string
  description: string
  icon?: React.ReactNode
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

// Props interfaces
interface ClienteDialogProps {
  isOpen: boolean
  onClose: () => void
  tipoDocumento: string
  documentoCliente: string
  setDocumentoCliente: (value: string) => void
  isConsultandoCliente: boolean
  setIsConsultandoCliente: (value: boolean) => void
  clienteData: ClienteConsultaResponse | null
  setClienteData: React.Dispatch<React.SetStateAction<ClienteConsultaResponse | null>>
  onConsultar: () => Promise<void>
  onLimpiar: () => void
}

interface BarcodeScannerDialogProps {
  isOpen: boolean
  onClose: () => void
  barcodeInput: string
  setBarcodeInput: (value: string) => void
  isBarcodeSearching: boolean
  barcodeSearchResult: any
  onSearch: () => Promise<void>
  onAddToCart: (product: any, barcodeData: any) => void
  isProcessingBarcode: boolean
}

interface DiscountDialogProps {
  isOpen: boolean
  onClose: () => void
  discountType: "percentage" | "fixed"
  setDiscountType: (type: "percentage" | "fixed") => void
  discountValue: string
  setDiscountValue: (value: string) => void
  onApply: () => void
  total: number
  cart: CartItem[]
  canApplyDiscount: () => boolean
}

interface ShortcutsDialogProps {
  isOpen: boolean
  onClose: () => void
}

interface BarcodeSelectionDialogProps {
  isOpen: boolean
  onClose: () => void
  selectedProductForBarcode: any
  availableBarcodes: any[]
  isLoadingBarcodesSelection: boolean
  onSelectBarcode: (barcode: any) => void
}

interface SavedCartsDialogProps {
  isOpen: boolean
  onClose: () => void
  savedCarts: SavedCart[]
  onLoadCart: (savedCart: SavedCart) => void
  onDeleteCart: (id: string, name: string) => void
}

interface CartNamingDialogProps {
  isOpen: boolean
  onClose: () => void
  cartName: string
  setCartName: (name: string) => void
  savedCartsLength: number
  onConfirm: () => void
}

// ===============================
// LOW PRIORITY DIALOGS
// ===============================

// Props para el diálogo de alerta SUNAT
interface SunatAlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tipoDocumento: string;
  pendingSaleData: any;
  onConfirm: () => void;
  onDirectSave: (data: any) => void;
  isProcessing?: boolean;
}

// Props para el diálogo de éxito de venta
interface SaleSuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onNewSale: () => void;
  onViewDetails: () => void;
  onShowTicket?: () => void; // Nueva función opcional para mostrar ticket
  saleId: number | string;
  tipoDocumento: string;
}

// Props para el diálogo de factura/invoice
interface InvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;  tipoDocumento: string;
  isInvoiceSending: boolean;
  invoiceResult: any;
  pdfUrl?: string | null;
  onNewSale?: () => void; // Nueva función opcional para iniciar nueva venta
  onViewDetails?: () => void; // Nueva función opcional para ver detalles
}

// Diálogo de alerta SUNAT
export const SunatAlertDialog: React.FC<SunatAlertDialogProps> = ({
  isOpen,
  onClose,
  tipoDocumento,
  pendingSaleData,
  onConfirm,
  onDirectSave,
  isProcessing = false
}) => {
  const handleCancel = () => {
    onClose();
  };

  const handleConfirm = () => {
    if (tipoDocumento === "") {
      // Si no hay tipo de documento, guardar directamente sin SUNAT
      onDirectSave(pendingSaleData);
    } else {
      // Si hay tipo de documento, confirmar envío a SUNAT
      onConfirm();
    }
  };
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="mx-3 my-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <Card className="border-0 shadow-none bg-transparent">
          <CardContent className="pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Facturación Electrónica
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {tipoDocumento === ""
                    ? "¿Está seguro de registrar esta venta sin comprobante electrónico?"
                    : `¿Desea registrar esta venta y generar un comprobante electrónico (${tipoDocumento === "01" ? "Factura" : "Boleta"}) para SUNAT?`}
                </AlertDialogDescription>
              </div>
            </div>
          </CardContent>
          
          <AlertDialogFooter className="gap-2 pt-3">
            <AlertDialogCancel
              onClick={handleCancel}
              disabled={isProcessing}
              className="h-8 text-xs border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <X className="h-3 w-3 mr-1" />
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isProcessing}
              className="h-8 text-xs bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white dark:text-gray-900"
              autoFocus
            >
              <FileText className="h-3 w-3 mr-1" />
              {tipoDocumento === "" ? "Guardar venta" : "Sí, enviar a SUNAT"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </Card>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Diálogo de resultado de facturación
export const InvoiceDialog: React.FC<InvoiceDialogProps> = ({
  isOpen,
  onClose,
  tipoDocumento,
  isInvoiceSending,
  invoiceResult,
  pdfUrl,
  onNewSale,
  onViewDetails
}) => {return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg mx-3 my-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <VisuallyHidden>
          <DialogTitle>Facturación Electrónica</DialogTitle>
          <DialogDescription>
            Resultado del envío de la {tipoDocumento === "01" ? "factura" : "boleta"} a SUNAT
          </DialogDescription>
        </VisuallyHidden>
        
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="space-y-2 pb-3 border-b border-gray-100 dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 text-sm font-medium">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              Facturación Electrónica
            </CardTitle>
            <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
              Resultado del envío de la {tipoDocumento === "01" ? "factura" : "boleta"} a SUNAT
            </CardDescription>          </CardHeader>

          <CardContent className="py-3">
            {isInvoiceSending ? (
              <div className="flex items-center justify-center py-6">
                <div className="text-center space-y-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full mx-auto w-fit">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Enviando {tipoDocumento === "01" ? "factura" : "boleta"} a SUNAT
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Por favor espere mientras procesamos su solicitud...
                    </p>
                  </div>
                </div>
              </div>
            ) : invoiceResult ? (
              <div className="space-y-3">
                <div className={`flex items-start gap-3 p-3 rounded-md border ${
                  invoiceResult.sunatResponse.success 
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50" 
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50"
                }`}>
                  <div className="flex-shrink-0">
                    {invoiceResult.sunatResponse.success ? (
                      <div className="p-1 bg-green-100 dark:bg-green-900/40 rounded-full">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                    ) : (
                      <div className="p-1 bg-red-100 dark:bg-red-900/40 rounded-full">
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                    )}
                  </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {invoiceResult.sunatResponse.success
                      ? `${tipoDocumento === "01" ? "Factura" : "Boleta"} enviada correctamente`
                      : `Error al enviar ${tipoDocumento === "01" ? "factura" : "boleta"}`}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {invoiceResult.sunatResponse.success
                      ? invoiceResult.sunatResponse.cdrDescription ||
                      `La ${tipoDocumento === "01" ? "factura" : "boleta"} ha sido aceptada por SUNAT`
                      : typeof invoiceResult.sunatResponse.error === "object" && invoiceResult.sunatResponse.error
                        ? (invoiceResult.sunatResponse.error as any).message || "Error desconocido"
                        : invoiceResult.sunatResponse.error ||
                        `Ocurrió un error al procesar la ${tipoDocumento === "01" ? "factura" : "boleta"}`}
                  </p>
                </div>
              </div>              {pdfUrl && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600">
                  <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      PDF generado correctamente
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-500">
                      Se ha generado el PDF de la {tipoDocumento === "01" ? "factura" : "boleta"}
                    </p>
                  </div>
                  <Button 
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      // Prevent any default behaviors
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Marcar en localStorage para saber que se ha abierto un PDF
                      window.localStorage.setItem('pdfViewed', 'true');
                      
                      // Open PDF in new tab
                      const pdfWindow = window.open(pdfUrl, "_blank");
                      
                      // Enfoque mejorado: usar una función que intenta de múltiples formas
                      const focusNuevaVentaBtn = () => {
                        // Intento 1: Por ID específico de este diálogo
                        let btnTarget = document.getElementById('nuevaVentaBtn') as HTMLButtonElement;
                        
                        // Intento 2: Por clase
                        if (!btnTarget) {
                          btnTarget = document.querySelector('.dialog-success-nueva-venta-btn') as HTMLButtonElement;
                        }
                        
                        // Intento 3: Por ID alternativo (si viene del otro diálogo)
                        if (!btnTarget) {
                          btnTarget = document.getElementById('nuevaVentaSuccessBtn') as HTMLButtonElement;
                        }
                        
                        // Intento 4: Por contenido de texto
                        if (!btnTarget) {
                          const allButtons = Array.from(document.querySelectorAll('button'));
                          btnTarget = allButtons.find(btn => 
                            btn.textContent?.toLowerCase().includes('nueva venta')
                          ) as HTMLButtonElement;
                        }
                        
                        if (btnTarget) {
                          // Forzar scroll al botón si es necesario
                          btnTarget.scrollIntoView({behavior: 'smooth', block: 'center'});
                          
                          // Enfocar el botón
                          btnTarget.focus({preventScroll: false});
                          // Agregar clase visual para resaltar
                          btnTarget.classList.add('focus-ring-pulse');
                          setTimeout(() => {
                            btnTarget.classList.remove('focus-ring-pulse');
                          }, 2000);
                        } else {
                          console.warn('No se pudo encontrar el botón Nueva Venta para enfocar');
                        }
                      };
                      
                      // Ejecutar varias veces con diferentes retrasos
                      // Incluir retrasos más largos para cuando el usuario regrese de ver el PDF
                      const delays = [100, 300, 600, 1000, 1500, 2000, 3000];
                      delays.forEach(delay => setTimeout(focusNuevaVentaBtn, delay));
                      
                      // También agregar un evento al cierre de la ventana del PDF
                      if (pdfWindow) {
                        try {
                          pdfWindow.addEventListener('beforeunload', () => {
                            // Cuando el usuario cierra la ventana del PDF, enfocar el botón
                            setTimeout(focusNuevaVentaBtn, 100);
                            setTimeout(focusNuevaVentaBtn, 500);
                          });
                        } catch (e) {
                          // Algunos navegadores pueden bloquear esto por seguridad

                        }
                      }
                    }} 
                    size="sm"
                    className="h-7 text-xs bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white dark:text-gray-900"
                  >
                    <FileText className="mr-1 h-3 w-3" />
                    Ver PDF
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-6">
              <div className="text-center space-y-2">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full mx-auto w-fit">
                  <AlertTriangle className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">No hay información disponible</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    No se pudo obtener información sobre el envío de la {tipoDocumento === "01" ? "factura" : "boleta"}
                  </p>
                </div>
              </div>
            </div>)}
          </CardContent>          <DialogFooter className="pt-3 border-t border-gray-100 dark:border-gray-800">
            {/* Mostrar diferentes botones según el resultado */}
            {!isInvoiceSending && invoiceResult && invoiceResult.sunatResponse?.success && onNewSale && onViewDetails ? (
              // Botones cuando la facturación fue exitosa
              <div className="flex gap-2 w-full">
                <Button 
                  onClick={(e) => {
                    // Evitar propagación y asegurar que se ejecute el evento
                    e.stopPropagation();
                    if (onNewSale) onNewSale();
                  }}
                  className="h-10 text-sm flex-1 bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700 transition-all duration-200 font-bold ring-2 ring-green-400 dark:ring-green-800 ring-offset-2 dark:ring-offset-gray-900 scale-105 focus-visible:outline-none focus-visible:ring-offset-4 focus-visible:ring-green-500 dark:focus-visible:ring-green-300 focus-ring-button"
                  autoFocus
                  id="nuevaVentaBtn"
                  tabIndex={0}
                  data-testid="nuevaVentaBtn"
                  onKeyDown={(e) => {
                    // Asegurar que Enter y Space activen el botón
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (onNewSale) onNewSale();
                    }
                  }}
                  ref={(node: HTMLButtonElement | null) => {
                    if (!node) return;
                    
                    // Comprobar si venimos de ver un PDF
                    const pdfViewed = window.localStorage.getItem('pdfViewed') === 'true';
                    
                    // Función de enfoque mejorada
                    const focusButton = () => {
                      if (!node) return;
                      
                      // Asegurar visibilidad
                      node.scrollIntoView({behavior: 'smooth', block: 'center'});
                      
                      // Intentar enfocar
                      try {
                        node.focus({preventScroll: false});

                        
                        // Efecto visual para destacar el botón
                        node.classList.add('focus-ring-pulse');
                        setTimeout(() => node.classList.remove('focus-ring-pulse'), 2000);
                      } catch (e) {
                        console.error('Error al enfocar botón:', e);
                      }
                    };
                    
                    // Estrategia de enfoque según origen
                    if (pdfViewed) {
                      // Si venimos de ver un PDF, usar múltiples intentos con delays
                      const delays = [0, 100, 300, 500, 1000, 2000];
                      delays.forEach(delay => setTimeout(focusButton, delay));
                      
                      // Limpiar flag
                      window.localStorage.removeItem('pdfViewed');
                    } else {
                      // Enfoque normal
                      focusButton();
                      
                      // Segundo intento por seguridad
                      setTimeout(focusButton, 200);
                    }
                    
                    // Escuchar eventos de visibilidad para restaurar el foco
                    const handleVisibilityChange = () => {
                      if (document.visibilityState === 'visible') {
                        focusButton();
                      }
                    };
                    
                    document.addEventListener('visibilitychange', handleVisibilityChange);
                    
                    // Limpiar listener cuando se desmonte
                    return () => {
                      document.removeEventListener('visibilitychange', handleVisibilityChange);
                    };
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Venta
                </Button>
                <Button 
                  onClick={onViewDetails} 
                  className="h-8 text-xs flex-1 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white"
                >
                  <Eye className="mr-1 h-3 w-3" />
                  Ver Detalles
                </Button>
              </div>
            ) : (
              // Botón estándar para otros casos
              <Button onClick={onClose} className="h-8 text-xs bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white dark:text-gray-900">
                <ChevronRight className="mr-1 h-3 w-3" />
                Continuar
              </Button>
            )}
          </DialogFooter>
        </Card>
      </DialogContent>
    </Dialog>  )
}

// Diálogo de éxito de venta (sin comprobante)
export const SaleSuccessDialog: React.FC<SaleSuccessDialogProps> = ({
  isOpen,
  onClose,
  onNewSale,
  onViewDetails,
  saleId,
  tipoDocumento
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg mx-3 my-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <VisuallyHidden>
          <DialogTitle>Venta Registrada Exitosamente</DialogTitle>
          <DialogDescription>
            {tipoDocumento === "" 
              ? "Venta sin comprobante registrada correctamente" 
              : "Venta registrada correctamente (sin envío a SUNAT)"}
          </DialogDescription>
        </VisuallyHidden>
        
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="space-y-2 pb-3 border-b border-gray-100 dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 text-sm font-medium">
              <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              ¡Venta Registrada Exitosamente!
            </CardTitle>
            <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
              {tipoDocumento === "" 
                ? "Venta sin comprobante registrada correctamente" 
                : "Venta registrada correctamente (sin envío a SUNAT)"}
            </CardDescription>
          </CardHeader>

          <CardContent className="py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-center py-4">
                <div className="text-center space-y-2">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full mx-auto w-fit">
                    <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Venta #{saleId}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      La venta se ha registrado correctamente en el sistema
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                    <AlertTriangle className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                      ¿Qué desea hacer ahora?
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Puede iniciar una nueva venta inmediatamente o revisar los detalles de la venta registrada.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>          <DialogFooter className="pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex gap-2 w-full">
              <Button 
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  if (onNewSale) onNewSale();
                }} 
                className="h-10 text-sm flex-1 bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700 transition-all duration-200 font-bold ring-2 ring-green-400 dark:ring-green-800 ring-offset-2 dark:ring-offset-gray-900 scale-105 focus-visible:outline-none focus-visible:ring-offset-4 focus-visible:ring-green-500 dark:focus-visible:ring-green-300 focus-ring-button dialog-success-nueva-venta-btn"
                autoFocus
                id="nuevaVentaSuccessBtn"
                tabIndex={0}
                data-testid="nuevaVentaSuccessBtn"
                onKeyDown={(e: React.KeyboardEvent) => {
                  // Respond to Enter and Space keys
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onNewSale) onNewSale();
                  }
                }}
                ref={(node: HTMLButtonElement | null) => {
                  if (!node) return;
                  
                  // Función de enfoque mejorada
                  const focusButton = () => {
                    if (!node) return;
                    
                    // Asegurar visibilidad
                    node.scrollIntoView({behavior: 'smooth', block: 'center'});
                    
                    try {
                      node.focus({preventScroll: false});
                      
                      // Efecto visual para destacar el botón
                      node.classList.add('focus-ring-pulse');
                      setTimeout(() => node.classList.remove('focus-ring-pulse'), 2000);
                    } catch (e) {
                      // Error al enfocar botón
                    }
                  };
                  
                  // Check if we are coming from a completed sale or PDF view
                  const ventaCompletada = window.localStorage.getItem('ventaCompletada') === 'true';
                  const pdfViewed = window.localStorage.getItem('pdfViewed') === 'true';
                  
                  if (ventaCompletada || pdfViewed) {
                    // Estrategia agresiva de enfoque para eventos de diálogo o PDF
                    const delays = [0, 100, 300, 500, 1000, 1500];
                    delays.forEach(delay => setTimeout(focusButton, delay));
                    
                    // Limpiar flags
                    window.localStorage.removeItem('ventaCompletada');
                    window.localStorage.removeItem('pdfViewed');
                  } else {
                    // Enfoque normal con un retry
                    focusButton();
                    setTimeout(focusButton, 200);
                  }
                  
                  // Agregar escucha de visibilidad para mantener foco
                  const handleVisibilityChange = () => {
                    if (document.visibilityState === 'visible') {
                      setTimeout(focusButton, 100);
                    }
                  };
                  
                  document.addEventListener('visibilitychange', handleVisibilityChange);
                  
                  // Limpiar listeners cuando se desmonte el componente
                  return () => {
                    document.removeEventListener('visibilitychange', handleVisibilityChange);
                  };
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva Venta
              </Button>
              
              <Button 
                onClick={onViewDetails} 
                variant="outline"
                className="h-8 text-xs flex-1 border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/20"
              >
                <Eye className="mr-1 h-3 w-3" />
                Ver Detalles
              </Button>
            </div>
          </DialogFooter>
        </Card>
      </DialogContent>
    </Dialog>
  )
}

// Cliente Dialog Component
export const ClienteDialog: React.FC<ClienteDialogProps> = ({
  isOpen,
  onClose,
  tipoDocumento,
  documentoCliente,
  setDocumentoCliente,
  isConsultandoCliente,
  // setIsConsultandoCliente, // Handled by parent component
  clienteData,
  // setClienteData, // Handled by parent component  
  onConsultar,
  onLimpiar
}) => {
  const isFactura = tipoDocumento === "01"
  const documentType = isFactura ? "RUC" : "DNI"
  const maxLength = isFactura ? 11 : 8

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && documentoCliente.trim()) {
      onConsultar()
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-3 my-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <VisuallyHidden>
          <DialogTitle>Datos del {isFactura ? "Contribuyente" : "Cliente"}</DialogTitle>
          <DialogDescription>
            Consultar información del {isFactura ? "contribuyente por RUC" : "cliente por DNI"}
          </DialogDescription>
        </VisuallyHidden>
        
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="space-y-2 pb-3 border-b border-gray-100 dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 text-sm font-medium">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                {isFactura ? <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" /> : <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
              </div>
              Datos del {isFactura ? "Contribuyente" : "Cliente"}
            </CardTitle>
            <CardDescription className="text-xs text-gray-600 dark:text-gray-400">            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 py-3">
            <div className="space-y-1">
              <Label htmlFor="documento" className="text-xs font-medium text-gray-700 dark:text-gray-300">{documentType}</Label>
              <Input
                id="documento"
                placeholder={`Ingrese ${documentType}`}
                value={documentoCliente}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, maxLength)
                  setDocumentoCliente(value)
                }}
                onKeyPress={handleKeyPress}
                maxLength={maxLength}
                autoFocus
                className="h-8 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500"
              />
            </div>

            {clienteData && (
              <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                <CardHeader className="pb-2 pt-2">
                  <CardTitle className="text-xs font-medium text-gray-700 dark:text-gray-300">Datos Obtenidos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {isFactura ? (
                    <>
                      <div>
                        <Label className="text-[10px] text-gray-500 dark:text-gray-400">Razón Social</Label>
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{clienteData.razonSocial}</p>
                      </div>
                      <div>
                        <Label className="text-[10px] text-gray-500 dark:text-gray-400">RUC</Label>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{clienteData.numeroDocumento}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label className="text-[10px] text-gray-500 dark:text-gray-400">Nombre Completo</Label>
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                          {clienteData.nombre || 
                            `${clienteData.nombres || ""} ${clienteData.apellidoPaterno || ""} ${clienteData.apellidoMaterno || ""}`.trim()}
                        </p>
                      </div>
                      <div>
                        <Label className="text-[10px] text-gray-500 dark:text-gray-400">DNI</Label>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{clienteData.numeroDocumento}</p>
                      </div>
                    </>
                  )}
                  {clienteData.direccion && (
                    <div>
                      <Label className="text-[10px] text-gray-500 dark:text-gray-400">Dirección</Label>
                      <p className="text-xs text-gray-700 dark:text-gray-300">{clienteData.direccion}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>

          <DialogFooter className="gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-8 text-xs border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancelar
            </Button>
            
            {clienteData && (
              <Button
                type="button"
                variant="destructive"
                onClick={onLimpiar}
                className="h-8 text-xs bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white"
              >
                Limpiar
              </Button>
            )}

            <Button
              type="button"
              onClick={onConsultar}
              disabled={!documentoCliente.trim() || isConsultandoCliente}
              className="h-8 text-xs bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white dark:text-gray-900"
            >
              {isConsultandoCliente && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Consultar
            </Button>
          </DialogFooter>
        </Card>
      </DialogContent>
    </Dialog>
  )
}

// Barcode Scanner Dialog Component
export const BarcodeScannerDialog: React.FC<BarcodeScannerDialogProps> = ({
  isOpen,
  onClose,
  barcodeInput,
  setBarcodeInput,
  isBarcodeSearching,
  barcodeSearchResult,
  onSearch,
  onAddToCart,
  isProcessingBarcode
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && barcodeInput.trim()) {
      onSearch()
    }
  }

  const handleAddToCart = () => {
    if (barcodeSearchResult) {
      onAddToCart(barcodeSearchResult.producto, {
        codigo: barcodeSearchResult.codigo_barras.codigo,
        cantidad: barcodeSearchResult.codigo_barras.cantidad || 1,
      })
      onClose()
    }  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-3 my-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <VisuallyHidden>
          <DialogTitle>Escanear Código de Barras</DialogTitle>
          <DialogDescription>
            Ingrese manualmente o escanee un código de barras para buscar productos
          </DialogDescription>
        </VisuallyHidden>
        
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="space-y-2 pb-3 border-b border-gray-100 dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 text-sm font-medium">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Scan className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              Escanear Código de Barras
            </CardTitle>
            <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
              Ingrese o escanee el código de barras del producto
            </CardDescription>
          </CardHeader>          <CardContent className="space-y-3 py-3">
            <div className="space-y-1">
              <Label htmlFor="barcode" className="text-xs font-medium text-gray-700 dark:text-gray-300">Código de Barras</Label>
              <Input
                id="barcode"
                placeholder="Escanee o ingrese el código"
                value={barcodeInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBarcodeInput(e.target.value)}
                onKeyPress={handleKeyPress}
                autoFocus
                disabled={isProcessingBarcode}
                className="h-8 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500"
              />
            </div>

            {barcodeSearchResult && (
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50">
                <CardHeader className="pb-2 pt-2">
                  <CardTitle className="flex items-center gap-2 text-xs font-medium text-green-700 dark:text-green-300">
                    <div className="p-1 bg-green-100 dark:bg-green-900/40 rounded-full">
                      <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                    </div>
                    Producto Encontrado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div>
                    <Label className="text-[10px] text-gray-500 dark:text-gray-400">Nombre</Label>
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{barcodeSearchResult.producto.nombre}</p>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <Label className="text-[10px] text-gray-500 dark:text-gray-400">Código</Label>
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-mono">{barcodeSearchResult.codigo_barras.codigo}</p>
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-500 dark:text-gray-400">Stock</Label>
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold">{barcodeSearchResult.codigo_barras.cantidad || 1}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500 dark:text-gray-400">Precio</Label>
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(Number.parseFloat(barcodeSearchResult.producto.precio_unitario_con_igv))}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>

          <DialogFooter className="gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-8 text-xs border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={onSearch}
              disabled={!barcodeInput.trim() || isBarcodeSearching || isProcessingBarcode}
              className="h-8 text-xs bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white dark:text-gray-900"
            >
              {isBarcodeSearching && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              <Search className="mr-1 h-3 w-3" />
              Buscar
            </Button>

            {barcodeSearchResult && (
              <Button
                type="button"
                onClick={handleAddToCart}
                className="h-8 text-xs bg-green-700 hover:bg-green-800 dark:bg-green-800 dark:hover:bg-green-900 text-white"
              >
                <ShoppingCart className="mr-1 h-3 w-3" />
                Agregar
              </Button>
            )}
          </DialogFooter>
        </Card>
      </DialogContent>
    </Dialog>
  )
}

// Discount Dialog Component
export const DiscountDialog: React.FC<DiscountDialogProps> = ({
  isOpen,
  onClose,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  onApply,
  total,
  cart,
  canApplyDiscount
}) => {
  const calculatePreview = () => {
    if (!discountValue || isNaN(Number(discountValue)) || Number(discountValue) <= 0) {
      return { amount: 0, total: total }
    }

    const value = Number(discountValue)
    let discountAmount = 0

    if (discountType === "percentage") {
      discountAmount = (total * value) / 100
    } else {
      discountAmount = value
    }

    return {
      amount: discountAmount,
      total: Math.max(0, total - discountAmount)
    }
  }

  const preview = calculatePreview()
  const offerProducts = cart.filter(item => item.es_oferta)
  const handleApply = () => {
    onApply()
    onClose()
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-3 my-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <VisuallyHidden>
          <DialogTitle>Aplicar Descuento</DialogTitle>
          <DialogDescription>
            Configure un descuento por porcentaje o monto fijo para la venta
          </DialogDescription>
        </VisuallyHidden>
        
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="space-y-2 pb-3 border-b border-gray-100 dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 text-sm font-medium">
              <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Percent className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              Aplicar Descuento
            </CardTitle>
            <CardDescription className="text-xs text-gray-600 dark:text-gray-400">            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 py-3">
            {offerProducts.length > 0 && (
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-md">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <strong>Advertencia:</strong> La venta contiene productos en oferta: {offerProducts.map(item => item.nombre).join(', ')}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Tipo de Descuento</Label>
              <Select value={discountType} onValueChange={setDiscountType}>
                <SelectTrigger className="h-8 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">
                    <div className="flex items-center gap-2">
                      <Percent className="h-3 w-3" />
                      <span className="text-sm">Porcentaje</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="fixed">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3 w-3" />
                      <span className="text-sm">Monto Fijo</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="discount-value" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {discountType === "percentage" ? "Porcentaje (%)" : "Monto (S/)"}
              </Label>
              <Input
                id="discount-value"
                type="number"
                placeholder={discountType === "percentage" ? "Ej: 10" : "Ej: 5.00"}
                value={discountValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDiscountValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (discountValue && !isNaN(Number(discountValue)) && Number(discountValue) > 0 && canApplyDiscount()) {
                      handleApply()
                    }
                  }
                }}
                min="0"
                max={discountType === "percentage" ? "100" : total.toString()}
                step={discountType === "percentage" ? "1" : "0.01"}
                autoFocus
                className="h-8 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500"
              />
            </div>

            {preview.amount > 0 && (
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50">
                <CardHeader className="pb-2 pt-2">
                  <CardTitle className="flex items-center gap-2 text-xs font-medium text-blue-700 dark:text-blue-300">
                    <div className="p-1 bg-blue-100 dark:bg-blue-900/40 rounded-full">
                      <FileCheck className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    Vista Previa del Descuento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 pt-0">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Subtotal:</span>
                    <span className="text-xs text-gray-700 dark:text-gray-300">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Descuento:</span>
                    <span className="text-xs text-red-600 dark:text-red-400 font-semibold">-{formatCurrency(preview.amount)}</span>
                  </div>
                  <hr className="border-gray-200 dark:border-gray-700" />
                  <div className="flex justify-between">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Total Final:</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{formatCurrency(preview.total)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>

          <DialogFooter className="gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-8 text-xs border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={handleApply}
              disabled={!discountValue || isNaN(Number(discountValue)) || Number(discountValue) <= 0 || !canApplyDiscount()}
              className="h-8 text-xs bg-green-700 hover:bg-green-800 dark:bg-green-800 dark:hover:bg-green-900 text-white"
            >
              Aplicar Descuento
            </Button>
          </DialogFooter>
        </Card>
      </DialogContent>
    </Dialog>
  )
}

// Shortcuts Dialog Component
export const ShortcutsDialog: React.FC<ShortcutsDialogProps> = ({
  isOpen,
  onClose
}) => {
  const shortcuts: Array<{
    category: string
    items: ShortcutItem[]
  }> = [
    {
      category: "Tipo de Documento",
      items: [
        { keys: "Alt + Shift + 1", description: "Sin comprobante" },
        { keys: "Alt + Shift + 2", description: "Boleta de Venta" },
        { keys: "Alt + Shift + 3", description: "Factura" },
      ]
    },
    {
      category: "Métodos de Pago",
      items: [
        { keys: "Alt + Shift + E", description: "Efectivo", icon: <Banknote className="h-3 w-3" /> },
        { keys: "Alt + Shift + T", description: "Tarjeta", icon: <CreditCard className="h-3 w-3" /> },
        { keys: "Alt + Shift + R", description: "Transferencia", icon: <MonitorSpeaker className="h-3 w-3" /> },
        { keys: "Alt + Shift + Y", description: "Yape", icon: <Smartphone className="h-3 w-3" /> },
        { keys: "Alt + Shift + P", description: "Plin", icon: <Smartphone className="h-3 w-3" /> },
      ]
    },    {
      category: "Funciones Principales",
      items: [
        { keys: "F1", description: "Mostrar esta ayuda" },
        { keys: "F2", description: "Activar/Desactivar escáner" },
        { keys: "F3", description: "Abrir escáner manual" },
        { keys: "F4", description: "Guardar carrito actual" },
        { keys: "F5", description: "Ver carritos guardados" },
        { keys: "F6", description: "Nuevo carrito" },
        { keys: "F7", description: "Datos del cliente" },
        { keys: "F8", description: "Procesar venta" },
        { keys: "F9", description: "Reiniciar para nueva venta" },
      ]
    },
    {
      category: "Descuentos",
      items: [
        { keys: "Ctrl + D", description: "Abrir diálogo de descuento" },
        { keys: "Alt + Shift + D", description: "Remover descuento" },
        { keys: "Ctrl + 1", description: "Descuento rápido 10%" },
        { keys: "Ctrl + 2", description: "Descuento rápido 20%" },
      ]
    },
    {
      category: "Otros",
      items: [
        { keys: "Alt + Shift + A", description: "Agregar último producto" },
        { keys: "Alt + Shift + M", description: "Cambiar modo de precio" },
      ]
    }  ]
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] mx-3 my-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-y-auto">
        <VisuallyHidden>
          <DialogTitle>Atajos de Teclado</DialogTitle>
          <DialogDescription>
            Lista completa de atajos de teclado disponibles en el sistema de ventas
          </DialogDescription>
        </VisuallyHidden>
        
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="space-y-2 pb-3 border-b border-gray-100 dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 text-sm font-medium">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Keyboard className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              Atajos de Teclado
            </CardTitle>
            <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
              Lista completa de atajos de teclado disponibles en el sistema de ventas
            </CardDescription>
          </CardHeader>          <CardContent className="space-y-4 py-3">
            {shortcuts.map((section, index) => (
              <div key={index}>
                <h3 className="text-xs font-semibold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                  <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                  {section.category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {section.items.map((shortcut, shortcutIndex) => (
                    <div
                      key={shortcutIndex}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200/50 dark:border-gray-600/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {'icon' in shortcut && shortcut.icon && (
                          <div className="p-1 bg-white dark:bg-gray-800 rounded">
                            {shortcut.icon}
                          </div>
                        )}
                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{shortcut.description}</span>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 shrink-0 ml-2">
                        {shortcut.keys}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>

          <DialogFooter className="pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button onClick={onClose} className="h-8 text-xs bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white dark:text-gray-900">
              Cerrar
            </Button>
          </DialogFooter>
        </Card>
      </DialogContent>
    </Dialog>
  )
}

// Barcode Selection Dialog Component
export const BarcodeSelectionDialog: React.FC<BarcodeSelectionDialogProps> = ({
  isOpen,
  onClose,
  selectedProductForBarcode,
  availableBarcodes,
  isLoadingBarcodesSelection,
  onSelectBarcode
}) => {  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg mx-3 my-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <VisuallyHidden>
          <DialogTitle>Seleccionar Código de Barras</DialogTitle>
          <DialogDescription>
            Seleccione un código de barras específico para el producto
          </DialogDescription>
        </VisuallyHidden>
        
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="space-y-2 pb-3 border-b border-gray-100 dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 text-sm font-medium">
              <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Scan className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              Seleccionar Código de Barras
            </CardTitle>
            <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
              {selectedProductForBarcode?.nombre && (
                <>Selecciona qué código de barras usar para: <strong>{selectedProductForBarcode.nombre}</strong></>
              )}
            </CardDescription>
          </CardHeader>          <CardContent className="py-3 max-h-96 overflow-y-auto">
            {isLoadingBarcodesSelection ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Cargando códigos de barras...</span>
                </div>
              </div>
            ) : availableBarcodes.length > 0 ? (
              <div className="space-y-2">
                {availableBarcodes.map((barcode, index) => (
                  <div 
                    key={index}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all duration-200"
                    onClick={() => onSelectBarcode(barcode)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="p-1 bg-gray-100 dark:bg-gray-800 rounded">
                            <Scan className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {barcode.codigo}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Stock disponible: <span className="font-semibold text-green-600 dark:text-green-400">{barcode.cantidad}</span> unidades
                        </div>
                        {barcode.fecha_ingreso && (
                          <div className="text-[10px] text-gray-500 dark:text-gray-500 mt-1">
                            Fecha de ingreso: {new Date(barcode.fecha_ingreso).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="ml-3">
                        <Button 
                          size="sm" 
                          className="h-7 text-xs bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white dark:text-gray-900"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectBarcode(barcode)
                          }}
                        >
                          Seleccionar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full mx-auto w-fit mb-2">
                  <AlertTriangle className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  No se encontraron códigos de barras para este producto
                </div>
              </div>
            )}
          </CardContent>

          <DialogFooter className="pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-8 text-xs border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </Card>
      </DialogContent>
    </Dialog>
  )
}

// Saved Carts Dialog Component
export const SavedCartsDialog: React.FC<SavedCartsDialogProps> = ({
  isOpen,
  onClose,
  savedCarts,
  onLoadCart,  onDeleteCart
}) => {  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg mx-3 my-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <VisuallyHidden>
          <DialogTitle>Carritos Guardados</DialogTitle>
          <DialogDescription>
            Lista de carritos de compras guardados previamente
          </DialogDescription>
        </VisuallyHidden>
        
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="space-y-2 pb-3 border-b border-gray-100 dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 text-sm font-medium">
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <ListOrdered className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              Carritos Guardados
            </CardTitle>
            <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
              Seleccione un carrito para cargarlo o eliminarlo
            </CardDescription>
          </CardHeader>          <CardContent className="py-3">
            <div className="max-h-[60vh] overflow-y-auto space-y-2">
              {savedCarts.length > 0 ? (
                savedCarts.map((savedCart) => (
                  <div
                    key={savedCart.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-indigo-100 dark:bg-indigo-900/40 rounded-full">
                          <UserCircle className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {savedCart.name}
                        </h4>
                      </div>
                      <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{new Date(savedCart.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center mt-1 text-xs">
                        <ShoppingCart className="h-3 w-3 mr-1 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-300">{savedCart.items.length} productos</span>
                        <span className="mx-2 text-gray-300 dark:text-gray-600">•</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(
                            savedCart.items.reduce(
                              (acc, item) => acc + Number.parseFloat(item.precio_unitario_con_igv) * item.cantidad,
                              0,
                            ),
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDeleteCart(savedCart.id, savedCart.name)}
                        className="h-7 w-7 p-0 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-900/50 dark:hover:bg-red-900/20 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onLoadCart(savedCart)}
                        className="h-7 text-xs bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white dark:text-gray-900"
                      >
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Cargar
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                    <ShoppingCart className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">No hay carritos guardados</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                    Guarde un carrito para poder recuperarlo más tarde
                  </p>
                </div>
              )}
            </div>
          </CardContent>

          <DialogFooter className="pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              onClick={onClose}
              className="h-8 text-xs bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white dark:text-gray-900"
            >
              <X className="h-3 w-3 mr-1" />
              Cerrar
            </Button>
          </DialogFooter>
        </Card>
      </DialogContent>
    </Dialog>
  )
}

// Cart Naming Dialog Component
export const CartNamingDialog: React.FC<CartNamingDialogProps> = ({
  isOpen,
  onClose,
  cartName,
  setCartName,
  savedCartsLength,
  onConfirm
}) => {  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-3 my-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <VisuallyHidden>
          <DialogTitle>Guardar Carrito</DialogTitle>
          <DialogDescription>
            Asigne un nombre al carrito para guardarlo temporalmente
          </DialogDescription>
        </VisuallyHidden>
        
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="space-y-2 pb-3 border-b border-gray-100 dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 text-sm font-medium">
              <div className="p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <PauseCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              Guardar Carrito
            </CardTitle>
            <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
              Asigne un nombre al carrito para identificarlo fácilmente
            </CardDescription>
          </CardHeader>          <CardContent className="py-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Nombre del Cliente</label>
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 p-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                  <UserCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <Input
                  placeholder="Ej: Cliente Habitual, Mesa 5, etc."
                  value={cartName}
                  onChange={(e) => setCartName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      onConfirm()
                    }
                  }}
                  className="h-8 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500"
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Si no asigna un nombre, se usará "Cliente {savedCartsLength + 1}"
              </p>
            </div>
          </CardContent>

          <DialogFooter className="gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-8 text-xs border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <X className="h-3 w-3 mr-1" />
              Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              className="h-8 text-xs bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white dark:text-gray-900"
            >
              <PauseCircle className="mr-1 h-3 w-3" />
              Guardar Carrito
            </Button>
          </DialogFooter>
        </Card>
      </DialogContent>
    </Dialog>
  )
}

// Export default object with all dialogs
export const SalesDialogs = {
  ClienteDialog,
  BarcodeScannerDialog,
  DiscountDialog,
  ShortcutsDialog,
  BarcodeSelectionDialog,
  SavedCartsDialog,
  CartNamingDialog,
  SunatAlertDialog,
  InvoiceDialog
}

export default SalesDialogs
