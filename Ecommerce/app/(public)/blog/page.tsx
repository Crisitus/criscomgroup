import type { Metadata } from "next"
import BlogList from "@/components/contenido/BlogList"

export const metadata: Metadata = {
  title: "Blog de tecnología, computadoras y servicio técnico | CRISCOM",
  description: "Guías para comprar, mejorar, mantener y reparar computadoras, laptops y componentes en Perú.",
  alternates: { canonical: "/blog" },
}

export default function BlogPage() {
  return <BlogList />
}
