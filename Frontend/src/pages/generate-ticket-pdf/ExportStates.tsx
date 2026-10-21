import { AlertCircle, Loader2, Package, RefreshCw } from "lucide-react"
import { Button } from "../../components/ui/button"

export const CargandoProductos = () => (
  <div className="min-h-[60vh] flex items-center justify-center" role="status">
    <div className="text-center space-y-3">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
      <p className="text-lg font-medium">Cargando productos...</p>
    </div>
  </div>
)

/** Error de carga: distinto de "no hay productos". Ofrece reintentar. */
export const ErrorCarga = ({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) => (
  <div className="min-h-[50vh] flex items-center justify-center p-6" role="alert">
    <div className="max-w-md text-center space-y-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-8">
      <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
      <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">No se pudieron cargar los productos</h2>
      <p className="text-sm text-red-700 dark:text-red-300">{mensaje}</p>
      <Button variant="outline" onClick={onReintentar}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Reintentar
      </Button>
    </div>
  </div>
)

export const SinResultados = ({ titulo, detalle, accion }: { titulo: string; detalle: string; accion?: { texto: string; onClick: () => void } }) => (
  <div className="text-center py-12 space-y-3">
    <Package className="h-12 w-12 mx-auto text-gray-400" />
    <h3 className="text-lg font-medium">{titulo}</h3>
    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">{detalle}</p>
    {accion && <Button variant="outline" onClick={accion.onClick}>{accion.texto}</Button>}
  </div>
)

/** Aviso sobre el listado (productos descartados, sin código de barras, lotes que no cuadran...). */
export const AvisoExport = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200" role="status">
    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
    <div>{children}</div>
  </div>
)
