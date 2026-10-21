import { ArrowUpDown, Search } from "lucide-react"
import { Checkbox } from "../../components/ui/checkbox"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import type { FiltrosBase } from "./productFilters"

interface Props<F extends FiltrosBase> {
  filtros: F
  cambiar: <K extends keyof F>(k: K, v: F[K]) => void
  categorias: string[]
  ordenes: Array<{ value: string; label: string }>
  /** Casillas extra propias de la pantalla (p. ej. "solo modificados"). */
  extras?: React.ReactNode
  idBase: string
}

const Casilla = ({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
    <Checkbox id={id} checked={checked} onCheckedChange={v => onChange(v === true)} />
    <Label htmlFor={id} className="text-sm cursor-pointer">{children}</Label>
  </div>
)
export { Casilla }

/** Busqueda, categoria, orden y casillas comunes a Tickets PDF y Exportar productos. */
export function ProductFilterFields<F extends FiltrosBase>({ filtros, cambiar, categorias, ordenes, extras, idBase }: Props<F>) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idBase}-q`}>Buscar producto</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input id={`${idBase}-q`} className="pl-10" placeholder="Nombre o SKU..." value={filtros.busqueda}
            onChange={e => cambiar("busqueda", e.target.value as F["busqueda"])} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Categoría</Label>
        <Select value={filtros.categoria || "todas"} onValueChange={v => cambiar("categoria", (v === "todas" ? "" : v) as F["categoria"])}>
          <SelectTrigger><SelectValue placeholder="Todas las categorías" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            <SelectItem value="sin_categoria">Sin categoría</SelectItem>
            {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-2"><ArrowUpDown className="h-4 w-4" />Ordenar por</Label>
        <Select value={filtros.ordenamiento} onValueChange={v => cambiar("ordenamiento", v as F["ordenamiento"])}>
          <SelectTrigger><SelectValue placeholder="Seleccionar orden" /></SelectTrigger>
          <SelectContent>{ordenes.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Opciones de filtrado</Label>
        <Casilla id={`${idBase}-stock`} checked={filtros.soloConStock} onChange={v => cambiar("soloConStock", v as F["soloConStock"])}>Solo con stock disponible</Casilla>
        <Casilla id={`${idBase}-ofertas`} checked={filtros.soloOfertas} onChange={v => cambiar("soloOfertas", v as F["soloOfertas"])}>Solo productos en oferta</Casilla>
        {extras}
      </div>
    </div>
  )
}
