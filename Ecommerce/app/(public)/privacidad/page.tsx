import type { Metadata } from "next"
import LegalDoc from "@/components/contenido/LegalDoc"
import { PRIVACIDAD } from "@/components/contenido/legalData"

export const metadata: Metadata = {
  title: "Política de privacidad | Criscom Group",
  description: "Cómo Criscom Group trata y protege los datos personales de clientes y visitantes.",
  alternates: { canonical: "/privacidad" },
}

export default function PrivacyPage() {
  return <LegalDoc doc={PRIVACIDAD} />
}
