"use client"

// Arma tu PC - rama "Guíame": tier de presupuesto, monto si "otro", uso,
// perifericos, marcas y hasta 2 prioridades (la 3.a se deshabilita con motivo).
import React from "react"
import { ArrowLeft, ArrowRight, Check, Cpu, Mouse } from "lucide-react"
import { AreaField, Field, SegGroup, type Errores } from "./serviciosShared"
import type { PrioridadArmado, TierPresupuesto } from "@/services/ecommerceApi"

export type Presupuesto = {
  tier_presupuesto: TierPresupuesto | ""
  presupuesto_personalizado: string
  uso_descripcion: string
  incluye_perifericos: "solo_pc" | "con_perifericos"
  marcas_preferencia: string
  prioridades: PrioridadArmado[]
}
export const PRESUPUESTO_INICIAL: Presupuesto = {
  tier_presupuesto: "", presupuesto_personalizado: "", uso_descripcion: "",
  incluye_perifericos: "solo_pc", marcas_preferencia: "", prioridades: [],
}

export const TIERS: { value: TierPresupuesto; label: string }[] = [
  { value: "oficina", label: "Oficina" },
  { value: "gamer", label: "Gamer" },
  { value: "alto_rendimiento", label: "Alto rendimiento" },
  { value: "workstation", label: "Workstation" },
  { value: "otro", label: "Otro presupuesto" },
]
export const PRIORIDADES: { value: PrioridadArmado; label: string }[] = [
  { value: "grafica", label: "Gráfica" },
  { value: "procesador", label: "Procesador" },
  { value: "placa", label: "Placa" },
  { value: "estetica", label: "Estética" },
  { value: "refrigeracion", label: "Refrigeración" },
  { value: "almacenamiento", label: "Almacenamiento" },
  { value: "silencio", label: "Silencio" },
  { value: "portabilidad", label: "Portabilidad" },
]
const PERIFERICOS = [
  { value: "solo_pc", label: "Solo la PC", icon: Cpu },
  { value: "con_perifericos", label: "Con periféricos", icon: Mouse },
]
export const MAX_PRIORIDADES = 2

export const validarPresupuesto = (v: Presupuesto): Errores => {
  const e: Errores = {}
  if (!v.tier_presupuesto) e.tier_presupuesto = "Elige el tipo de armado."
  if (v.tier_presupuesto === "otro") {
    const n = Number(v.presupuesto_personalizado)
    if (!v.presupuesto_personalizado.trim() || !Number.isFinite(n) || n <= 0 || n > 99999999) {
      e.presupuesto_personalizado = "Indica un monto en soles mayor que 0."
    }
  }
  if (v.uso_descripcion.length > 2000) e.uso_descripcion = "Máximo 2000 caracteres."
  if (v.marcas_preferencia.length > 255) e.marcas_preferencia = "Máximo 255 caracteres."
  return e
}

type Props = {
  valores: Presupuesto
  errores: Errores
  onChange: <K extends keyof Presupuesto>(campo: K, valor: Presupuesto[K]) => void
  onAtras: () => void
  onContinuar: () => void
}

const ArmarPcPresupuesto = ({ valores: v, errores, onChange, onAtras, onContinuar }: Props) => {
  const lleno = v.prioridades.length >= MAX_PRIORIDADES
  const togglePrioridad = (p: PrioridadArmado) => {
    const activa = v.prioridades.includes(p)
    if (!activa && lleno) return
    onChange("prioridades", activa ? v.prioridades.filter((x) => x !== p) : [...v.prioridades, p])
  }
  return (
    <>
      <section className="card">
        <h2>Presupuesto y uso</h2>
        <div className="grid">
          <SegGroup
            name="tier_presupuesto"
            label="Tipo de armado"
            options={TIERS}
            value={v.tier_presupuesto}
            onChange={(x) => onChange("tier_presupuesto", x as Presupuesto["tier_presupuesto"])}
          />
          {errores.tier_presupuesto && <p className="err s12"><span>{errores.tier_presupuesto}</span></p>}
          {v.tier_presupuesto === "otro" && (
            <Field
              name="presupuesto_personalizado"
              label="Monto en soles"
              span={4}
              type="number"
              inputMode="decimal"
              prefix="S/"
              value={v.presupuesto_personalizado}
              onChange={(x) => onChange("presupuesto_personalizado", x)}
              placeholder="Mayor que 0"
              error={errores.presupuesto_personalizado}
            />
          )}
          <AreaField
            name="uso_descripcion"
            label="Para qué lo usarás"
            span={12}
            value={v.uso_descripcion}
            onChange={(x) => onChange("uso_descripcion", x)}
            placeholder="Juegos, edición de video, oficina…"
            maxLength={2000}
            optional
            error={errores.uso_descripcion}
          />
        </div>
      </section>
      <section className="card">
        <h2>Preferencias</h2>
        <div className="grid">
          <SegGroup
            name="incluye_perifericos"
            label="Periféricos"
            span={6}
            options={PERIFERICOS}
            value={v.incluye_perifericos}
            onChange={(x) => onChange("incluye_perifericos", x as Presupuesto["incluye_perifericos"])}
          />
          <Field
            name="marcas_preferencia"
            label="Marcas de preferencia"
            span={6}
            value={v.marcas_preferencia}
            onChange={(x) => onChange("marcas_preferencia", x)}
            placeholder="Ej.: AMD, NVIDIA"
            maxLength={255}
            optional
            error={errores.marcas_preferencia}
          />
          <div className="f s12">
            <span className="lb" id="prioridades-l">Prioridades <small>(máximo 2)</small></span>
            <div className="wrap" role="group" aria-labelledby="prioridades-l">
              {PRIORIDADES.map((p) => {
                const activa = v.prioridades.includes(p.value)
                const bloqueada = !activa && lleno
                return (
                  <button
                    key={p.value}
                    type="button"
                    className="opt"
                    aria-pressed={activa}
                    aria-disabled={bloqueada || undefined}
                    aria-describedby={bloqueada ? "prioridades-why" : undefined}
                    onClick={() => togglePrioridad(p.value)}
                  >
                    <Check size={16} className="ic tk" aria-hidden />
                    <span>{p.label}</span>
                  </button>
                )
              })}
            </div>
            <div className="cnt">
              <span id="prioridades-why">{lleno ? "Máximo 2 prioridades. Quita una para elegir otra." : "Elige hasta 2."}</span>
              <span className="num">{v.prioridades.length} de 2</span>
            </div>
          </div>
        </div>
      </section>
      <div className="bar">
        <button type="button" className="btn out" onClick={onAtras}>
          <ArrowLeft size={18} className="ic" aria-hidden />
          <span>Atrás</span>
        </button>
        <button type="button" className="btn" onClick={onContinuar}>
          <span>Continuar</span>
          <ArrowRight size={18} className="ic" aria-hidden />
        </button>
      </div>
    </>
  )
}

export default ArmarPcPresupuesto
