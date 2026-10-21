"use client"

// Arma tu PC - rama "Traigo mis piezas": mensaje con minimo 10 caracteres,
// contador en vivo y el motivo junto al boton deshabilitado.
import React from "react"
import { ArrowLeft, ArrowRight, Info } from "lucide-react"
import { AreaField } from "./serviciosShared"

export const MIN_PIEZAS = 10

type Props = {
  mensaje: string
  onChange: (v: string) => void
  onAtras: () => void
  onContinuar: () => void
}

const ArmarPcPropio = ({ mensaje, onChange, onAtras, onContinuar }: Props) => {
  const faltan = Math.max(0, MIN_PIEZAS - mensaje.trim().length)
  const bloqueado = faltan > 0
  return (
    <>
      <section className="card">
        <h2>Qué piezas traes</h2>
        <div className="grid">
          <AreaField
            name="piezas"
            label="Lista de piezas"
            span={12}
            rows={5}
            value={mensaje}
            onChange={onChange}
            placeholder="Placa, procesador, memoria, fuente, gabinete…"
            hint="Mínimo 10 caracteres."
            maxLength={4000}
          />
        </div>
      </section>
      <div className={bloqueado ? "bar has-why" : "bar"}>
        <p className="why note">
          <Info size={16} className="ic" aria-hidden />
          <span>{`Faltan ${faltan} caracteres para continuar.`}</span>
        </p>
        <button type="button" className="btn out" onClick={onAtras}>
          <ArrowLeft size={18} className="ic" aria-hidden />
          <span>Atrás</span>
        </button>
        <button
          type="button"
          className="btn"
          aria-disabled={bloqueado || undefined}
          onClick={() => { if (!bloqueado) onContinuar() }}
        >
          <span>Continuar</span>
          <ArrowRight size={18} className="ic" aria-hidden />
        </button>
      </div>
    </>
  )
}

export default ArmarPcPropio
