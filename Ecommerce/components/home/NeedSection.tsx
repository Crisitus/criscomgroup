"use client"

// 4 - "¿Que necesitas?": 3 tarjetas fijas de navegacion (no son un endpoint).
import Link from "next/link"
import { ArrowRight, Cpu, Plane, Wrench, type LucideIcon } from "lucide-react"

const NEEDS: { icon: LucideIcon; title: string; text: string; cta: string; href: string }[] = [
  { icon: Cpu, title: "Arma tu PC", text: "Cotiza una PC a tu medida con componentes de la tienda.", cta: "Armar mi PC", href: "/armar-pc" },
  { icon: Plane, title: "Importa con nosotros", text: "Pide productos del exterior y te acompañamos en la importación.", cta: "Solicitar importación", href: "/importaciones" },
  { icon: Wrench, title: "Servicio técnico", text: "Diagnóstico, reparación y mantenimiento de tu equipo.", cta: "Pedir servicio", href: "/servicio-tecnico" },
]

const NeedSection = () => (
  <section className="sec pg-wrap" aria-label="¿Qué necesitas?">
    <div className="sec-hd"><h2>¿Qué necesitas?</h2></div>
    <div className="need-grid">
      {NEEDS.map((n) => (
        <div key={n.href} className="need">
          <span className="tile"><n.icon className="pg-ic" aria-hidden /></span>
          <div>
            <h3>{n.title}</h3>
            <p>{n.text}</p>
          </div>
          <Link className="btn btn-outline" href={n.href}>
            {n.cta} <ArrowRight style={{ width: 16, height: 16 }} aria-hidden />
          </Link>
        </div>
      ))}
    </div>
  </section>
)

export default NeedSection
