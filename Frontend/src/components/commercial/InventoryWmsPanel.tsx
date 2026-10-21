import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, PackageCheck, Plus } from "lucide-react";
import { toast } from "sonner";
import { commercialApi } from "../../services/commercialService";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export function InventoryWmsPanel({ products = [] }: { products?: any[] }) {
  const queryClient = useQueryClient();
  const [location, setLocation] = useState({ codigo: "", nombre: "", tipo: "almacen" });
  const [quant, setQuant] = useState({ producto_id: "", ubicacion_id: "", disponible: "1", lote: "", numero_serie: "" });
  const { data: locations = [] } = useQuery({ queryKey: ["inventory-locations"], queryFn: commercialApi.locations });
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ["inventory-locations"] }); queryClient.invalidateQueries({ queryKey: ["commercial-inventory-dashboard"] }); };
  const createLocation = useMutation({ mutationFn: () => commercialApi.createLocation(location), onSuccess: () => { toast.success("Ubicación creada"); setLocation({ codigo: "", nombre: "", tipo: "almacen" }); refresh(); }, onError: (e: any) => toast.error(e.response?.data?.message || "No se pudo crear la ubicación") });
  const saveQuant = useMutation({ mutationFn: () => commercialApi.setQuant(Number(quant.producto_id), { ...quant, ubicacion_id: Number(quant.ubicacion_id), disponible: Number(quant.disponible) }), onSuccess: () => { toast.success("Existencia ubicada"); setQuant({ producto_id: "", ubicacion_id: "", disponible: "1", lote: "", numero_serie: "" }); refresh(); }, onError: (e: any) => toast.error(e.response?.data?.message || "No se pudo ubicar la existencia") });
  return (
    <Card className="border-cyan-500/20">
      <CardHeader><CardTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5" />Ubicaciones, lotes y series</CardTitle><CardDescription>Distribuye el saldo disponible del producto. Las reservas del taller conservan esta identidad.</CardDescription></CardHeader>
      <CardContent className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <div className="grid gap-2 rounded-xl border p-4">
          <p className="flex items-center gap-2 font-medium"><MapPin className="h-4 w-4" />Nueva ubicación</p>
          <div className="grid gap-2 sm:grid-cols-2"><Input placeholder="Código (TALLER-A)" value={location.codigo} onChange={(e) => setLocation({ ...location, codigo: e.target.value })} /><Input placeholder="Nombre" value={location.nombre} onChange={(e) => setLocation({ ...location, nombre: e.target.value })} /></div>
          <Select value={location.tipo} onValueChange={(tipo) => setLocation({ ...location, tipo })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["almacen","tienda","taller","transito","virtual"].map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" disabled={!location.codigo.trim() || !location.nombre.trim() || createLocation.isPending} onClick={() => createLocation.mutate()}><Plus className="mr-2 h-4 w-4" />Crear ubicación</Button>
        </div>
        <div className="grid gap-2 rounded-xl border p-4">
          <p className="font-medium">Asignar existencia</p>
          <div className="grid gap-2 sm:grid-cols-2"><Select value={quant.producto_id} onValueChange={(producto_id) => setQuant({ ...quant, producto_id })}><SelectTrigger><SelectValue placeholder="Producto" /></SelectTrigger><SelectContent>{products.map((p) => <SelectItem key={p.id_producto} value={String(p.id_producto)}>{p.sku} · {p.nombre} · disp. {p.stock_disponible ?? p.stock}</SelectItem>)}</SelectContent></Select><Select value={quant.ubicacion_id} onValueChange={(ubicacion_id) => setQuant({ ...quant, ubicacion_id })}><SelectTrigger><SelectValue placeholder="Ubicación" /></SelectTrigger><SelectContent>{locations.map((l: any) => <SelectItem key={l.id_ubicacion_inventario} value={String(l.id_ubicacion_inventario)}>{l.codigo} · {l.nombre}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-2 sm:grid-cols-3"><Input type="number" min="0" step="1" placeholder="Disponible" value={quant.disponible} onChange={(e) => setQuant({ ...quant, disponible: e.target.value })} /><Input placeholder="Lote (opcional)" value={quant.lote} onChange={(e) => setQuant({ ...quant, lote: e.target.value })} /><Input placeholder="Serie (opcional)" value={quant.numero_serie} onChange={(e) => setQuant({ ...quant, numero_serie: e.target.value })} /></div>
          <Button disabled={!quant.producto_id || !quant.ubicacion_id || saveQuant.isPending} onClick={() => saveQuant.mutate()}>Guardar distribución</Button>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">{locations.map((l: any) => <span key={l.id_ubicacion_inventario} className="rounded-full border px-2 py-1">{l.codigo} · {l.nombre}</span>)}</div>
        </div>
      </CardContent>
    </Card>
  );
}
