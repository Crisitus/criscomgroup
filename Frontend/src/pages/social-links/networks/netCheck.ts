import { Facebook, Instagram, MessageCircle, Music, Youtube, type LucideIcon } from "lucide-react"
import type { SocialLinks } from "../../../services/socialLinksService"

export interface Net { k: keyof SocialLinks; n: string; icon: LucideIcon; hosts: string[]; dom: string; ph: string }

export const NET: Net[] = [
  { k: "instagram_url", n: "Instagram", icon: Instagram, hosts: ["instagram.com", "www.instagram.com", "m.instagram.com"], dom: "instagram.com", ph: "https://www.instagram.com/tu-cuenta/" },
  { k: "facebook_url", n: "Facebook", icon: Facebook, hosts: ["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com", "fb.com", "fb.me"], dom: "facebook.com", ph: "https://www.facebook.com/tu-pagina" },
  { k: "tiktok_url", n: "TikTok", icon: Music, hosts: ["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"], dom: "tiktok.com", ph: "https://www.tiktok.com/@tu-cuenta" },
  { k: "youtube_url", n: "YouTube", icon: Youtube, hosts: ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"], dom: "youtube.com o youtu.be", ph: "https://www.youtube.com/@tu-canal" },
  { k: "whatsapp_number", n: "WhatsApp", icon: MessageCircle, hosts: [], dom: "", ph: "Solo d\u00edgitos, de 8 a 15" },
]

export type NetState = "ok" | "bad" | "empty"
export interface NetCheck { s: NetState; m?: string; v?: string; note?: string }

const msgBad = (n: Net) => n.k === "whatsapp_number" ? "WhatsApp debe tener entre 8 y 15 d\u00edgitos" : `${n.n} debe ser un enlace https de ${n.dom}`

/** Misma regla que el backend: HTTPS + host permitido; WhatsApp 8-15 d\u00edgitos (9 d\u00edgitos se prefija con 51). */
export function checkNet(n: Net, raw: string): NetCheck {
  const v = (raw || "").trim()
  if (!v) return { s: "empty", v: "" }
  if (n.k === "whatsapp_number") {
    const d = v.replace(/[\s+()-]/g, "")
    if (!/^\d{8,15}$/.test(d)) return { s: "bad", m: msgBad(n) }
    return d.length === 9 ? { s: "ok", v: `51${d}`, note: `Se guardar\u00e1 como 51${d}` } : { s: "ok", v: d }
  }
  let u: URL
  try { u = new URL(v) } catch { return { s: "bad", m: msgBad(n) } }
  return u.protocol === "https:" && n.hosts.includes(u.hostname.toLowerCase()) ? { s: "ok", v } : { s: "bad", m: msgBad(n) }
}

export const phone = (d: string) => d.startsWith("51") && d.length === 11 ? `+51 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}` : `+${d}`
export const EMPTY_LINKS: SocialLinks = { instagram_url: "", facebook_url: "", tiktok_url: "", youtube_url: "", whatsapp_number: "" }
