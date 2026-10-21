import type { Metadata } from "next"
import LibroPage from "@/components/contenido/LibroPage"

export const metadata: Metadata = {
  title: "Libro de reclamaciones | Criscom Group",
  description: "Registra una queja o reclamo relacionado con productos, servicios o atención de Criscom Group.",
  alternates: { canonical: "/libro-reclamaciones" },
}

export default function Page() {
  return <LibroPage />
}
