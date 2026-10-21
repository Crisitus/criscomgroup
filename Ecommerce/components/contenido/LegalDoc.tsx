"use client"

// Documento legal (port criscom-ecom-contenido): texto LITERAL, índice de 6
// secciones (sticky en desktop, desplegable en móvil), anclas con sección activa
// y enlaces cruzados al cierre. Sin muros de texto: secciones como tarjetas.
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, BookOpen, Calendar, ChevronDown, Mail, RotateCw } from "lucide-react"
import { PageHead } from "./contenidoShared"
import type { LegalDoc as LegalDocData } from "./legalData"
import { useConfigPublica } from "@/hooks/useSocialLinks"
import { waHref } from "@/components/home/homeShared"

const iconoCierre = (href: string) =>
  href.includes("libro") ? BookOpen : href.includes("cambios") ? RotateCw : Mail

export default function LegalDoc({ doc }: { doc: LegalDocData }) {
  const [activa, setActiva] = useState(0)
  const config = useConfigPublica()

  // /contacto fue borrada en el port del home: «Contactar» va a WhatsApp
  // (config-publica) y, si no hay número, al inicio.
  const resolverHref = (href: string): { href: string; externo: boolean } => {
    if (href !== "/contacto") return { href, externo: false }
    const wa = waHref(config?.whatsapp_number)
    return wa ? { href: wa, externo: true } : { href: "/", externo: false }
  }

  // Sección activa: hash inicial y scroll-spy.
  useEffect(() => {
    const m = window.location.hash.match(/^#s(\d+)$/)
    if (m) setActiva(Number(m[1]) - 1)
    const secs = Array.from(document.querySelectorAll<HTMLElement>(".pg-contenido .sec"))
    if (!("IntersectionObserver" in window) || secs.length === 0) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            const i = secs.indexOf(en.target as HTMLElement)
            if (i >= 0) setActiva(i)
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px" },
    )
    secs.forEach((s) => obs.observe(s))
    return () => obs.disconnect()
  }, [])

  const items = doc.secciones.map((s, i) => (
    <li key={i}>
      <a href={`#s${i + 1}`} aria-current={i === activa ? "location" : undefined} onClick={() => setActiva(i)}>
        <i className="n" style={{ fontStyle: "normal" }}>{i + 1}</i>
        {s.h2}
      </a>
    </li>
  ))

  return (
    <div className="pg-contenido"><div className="wrap">
      <PageHead titulo={doc.h1} read
        sub={`Última actualización: ${doc.actualizado}`}
        iconoSub={<Calendar size={14} strokeWidth={1.75} className="pg-ic" aria-hidden />} />
      <div className="legal">
        <nav className="toc" aria-label="Índice de secciones">
          <h2>En esta página</h2>
          <ol>{items}</ol>
        </nav>
        <details className="fold tocm">
          <summary>Índice · {doc.secciones.length} secciones <ChevronDown size={16} strokeWidth={1.75} className="pg-ic cv" aria-hidden /></summary>
          <div className="in"><ol>{items}</ol></div>
        </details>
        <div className="secs">
          {doc.secciones.map((s, i) => (
            <article className={`sec card${i === activa ? " on" : ""}`} id={`s${i + 1}`} key={i}>
              <h2><i className="n" style={{ fontStyle: "normal" }}>{i + 1}.</i>{s.h2}</h2>
              {s.parrafos.map((p, j) => <p key={j}>{p}</p>)}
            </article>
          ))}
          <section className="xl">
            <h2>Ver también</h2>
            <div className="xlinks">
              {doc.enlacesCierre.map((l) => {
                const { href, externo } = resolverHref(l.href)
                const Icono = iconoCierre(l.href)
                const inner = (
                  <>
                    <Icono size={20} strokeWidth={1.75} className="pg-ic" aria-hidden />
                    <i className="xt" style={{ fontStyle: "normal" }}>
                      {l.texto}
                      <small>{externo ? "WhatsApp" : href}</small>
                    </i>
                    <ArrowRight size={16} strokeWidth={1.75} className="pg-ic" aria-hidden />
                  </>
                )
                return externo
                  ? <a key={l.texto} href={href} target="_blank" rel="noopener noreferrer">{inner}</a>
                  : <Link key={l.texto} href={href}>{inner}</Link>
              })}
            </div>
          </section>
        </div>
      </div>
    </div></div>
  )
}
