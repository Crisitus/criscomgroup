import { Boxes, FileText, Tags, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";

type Section = "products" | "purchases" | "quotes" | "categories";

const sections = [
  { id: "products", label: "Productos e inventario", path: "/products", icon: Boxes },
  { id: "purchases", label: "Compras y proveedores", path: "/commercial-control?tab=purchases", icon: Truck },
  { id: "quotes", label: "Cotizaciones", path: "/commercial-control?tab=quotes", icon: FileText },
  { id: "categories", label: "Categorías", path: "/categories", icon: Tags },
] as const;

export function CommercialNavigation({ active }: { active: Section }) {
  const navigate = useNavigate();
  return <nav aria-label="Navegación de inventario y compras" className="flex w-full flex-wrap gap-2 rounded-2xl border bg-card/90 p-2 shadow-sm backdrop-blur">
    {sections.map(({ id, label, path, icon: Icon }) => <Button key={id} type="button" variant={active === id ? "default" : "ghost"} className={active === id ? "shadow-sm" : "text-muted-foreground hover:text-foreground"} onClick={() => navigate(path)}><Icon className="mr-2 h-4 w-4" />{label}</Button>)}
  </nav>;
}
