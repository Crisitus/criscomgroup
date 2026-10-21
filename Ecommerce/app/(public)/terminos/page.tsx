import type { Metadata } from "next"
import LegalDoc from "@/components/contenido/LegalDoc"
import { TERMINOS } from "@/components/contenido/legalData"

export const metadata: Metadata = {
  title: "Términos y condiciones | Criscom Group",
  description: "Condiciones aplicables a compras, servicios y pedidos realizados en Criscom Group.",
  alternates: { canonical: "/terminos" },
}

export default function TermsPage() {
  return <LegalDoc doc={TERMINOS} />
}
