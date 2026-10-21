"use client"

// Tarjeta de exito tras enviar una solicitud: el codigo de seguimiento es lo
// mas grande de la pantalla, copiable, con "que sigue" y acciones.
import React, { useState } from "react"
import Link from "next/link"
import { Check, CircleCheck, Copy } from "lucide-react"

type Props = {
  codigo: string
  titulo: string
  pasos: string[]
  recap?: [string, string][]
  accionPrimaria: { href: string; texto: string; variante?: "primary" | "out" }
}

const ExitoSolicitud = ({ codigo, titulo, pasos, recap = [], accionPrimaria }: Props) => {
  const [copiado, setCopiado] = useState(false)
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Portapapeles no disponible: el codigo queda visible para copiarlo a mano.
    }
  }
  return (
    <section className="card ok">
      <p className="okh">
        <CircleCheck size={20} className="ic" aria-hidden />
        <span>{titulo}</span>
      </p>
      <p className="lb mut">Tu código de seguimiento</p>
      <div className="codeRow">
        <output className="code num">{codigo}</output>
        <button type="button" className="btn out" onClick={copiar}>
          {copiado ? <Check size={18} className="ic" aria-hidden /> : <Copy size={18} className="ic" aria-hidden />}
          <span>{copiado ? "Copiado" : "Copiar código"}</span>
        </button>
      </div>
      <p className="sr" role="status" aria-live="polite">
        {copiado ? "Código copiado" : ""}
      </p>
      <p>
        <b>Guárdalo.</b> Sin este código no podrás consultar el avance.
      </p>
      {recap.length > 0 && (
        <dl className="recap">
          {recap.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <h2 className="h2">Qué sigue</h2>
      <ol className="next">
        {pasos.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
      <div className="acts">
        <Link className={accionPrimaria.variante === "out" ? "btn out" : "btn"} href={accionPrimaria.href}>
          <span>{accionPrimaria.texto}</span>
        </Link>
        <Link className="btn out" href="/">
          <span>Volver al inicio</span>
        </Link>
      </div>
    </section>
  )
}

export default ExitoSolicitud
