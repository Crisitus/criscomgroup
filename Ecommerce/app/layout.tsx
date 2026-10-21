import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { getConfigPublicaServer, formatTelefono } from "@/services/configPublicaService";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://criscomgroup.com.pe").replace(/\/$/, "");

// ecom-logica T1: el teléfono del JSON-LD sale de /api/ecommerce/config-publica;
// si el backend no lo tiene, el campo se omite (no se inventa).
const buildOrganizationStructuredData = (telephone: string | null) => ({
  "@context": "https://schema.org",
  "@type": ["Organization", "LocalBusiness", "ComputerStore"],
  "@id": `${siteUrl}/#organization`,
  name: "CRISCOM",
  legalName: "Criscom Group",
  url: siteUrl,
  logo: `${siteUrl}/criscom-favicon.png`,
  image: `${siteUrl}/criscom-favicon.png`,
  ...(telephone ? { telephone } : {}),
  areaServed: ["Arequipa", "Lima", "Perú"],
  contactPoint: {
    "@type": "ContactPoint",
    ...(telephone ? { telephone } : {}),
    contactType: "sales and customer support",
    availableLanguage: "Spanish",
  },
});

export const metadata: Metadata = {
  title: "Criscom Group | Tecnología que impulsa tu futuro",
  description:
    "Criscom Group — venta de tecnología y soporte técnico especializado en Lima y Arequipa, Perú.",
  icons: {
    icon: [{ url: "/criscom-favicon.png?v=2", type: "image/png" }],
    shortcut: "/criscom-favicon.png?v=2",
    apple: "/criscom-favicon.png?v=2",
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://criscomgroup.com.pe",
  ),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Criscom Group | Tecnología que impulsa tu futuro",
    description:
      "Tecnología de vanguardia, asesoría especializada y soporte técnico profesional.",
    url: "https://criscomgroup.com.pe",
    siteName: "Criscom Group",
    locale: "es_PE",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const configPublica = await getConfigPublicaServer();
  const organizationStructuredData = buildOrganizationStructuredData(
    formatTelefono(configPublica?.whatsapp_number),
  );
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationStructuredData).replace(/</g, "\\u003c"),
          }}
        />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

