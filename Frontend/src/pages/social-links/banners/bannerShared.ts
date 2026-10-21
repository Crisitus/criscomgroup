import type { Banner } from "../../../services/marketingService"

export type Row = Banner & { id_banner: number }

export const IMG_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"]
export const VID_TYPES = ["video/mp4", "video/webm"]
export const IMG_MAX = 8 * 1024 * 1024
export const VID_MAX = 30 * 1024 * 1024
export const TARGET_KB = 400
export const ACCEPT = [...IMG_TYPES, ...VID_TYPES].join(",")
export const MSG_FORMAT = "Formato no permitido. Usa JPG, PNG, WebP, AVIF, MP4 o WebM"

/** Devuelve el mensaje de error del archivo (mismas reglas del backend) o null si es válido. */
export function fileProblem(f: File): string | null {
  if (![...IMG_TYPES, ...VID_TYPES].includes(f.type)) return MSG_FORMAT
  const vid = f.type.startsWith("video/")
  if (f.size > (vid ? VID_MAX : IMG_MAX)) return `${vid ? "El video" : "La imagen"} supera el máximo de ${vid ? 30 : 8} MB`
  return null
}

export const kb = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
export const isRow = (b: Banner): b is Row => typeof b.id_banner === "number"
export const bannerTitle = (b: Banner) => b.titulo || "Banner sin título"
export const bannerOn = (b: Banner) => b.activo !== false
