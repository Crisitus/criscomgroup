// URL publica de la ficha de un producto en la tienda (la que codifica el QR del ticket).
const SITE = ((import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) || "https://criscomgroup.pe").replace(/\/$/, "")

export const urlPublicaProducto = (idProducto: number) => `${SITE}/producto/${idProducto}`
