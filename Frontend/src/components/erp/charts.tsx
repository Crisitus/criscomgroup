"use client"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { tickK, valueK } from "./format"

/** Gráficos SVG del rediseño: una sola serie en el color de marca, sin leyendas,
 *  sin rotación ni recortes de etiquetas, valores directos. Se miden con
 *  ResizeObserver para que el texto nunca se escale. */

const nice = (m: number) => {
  if (m <= 0) return { max: 4, step: 1 }
  const raw = m / 4
  const p = 10 ** Math.floor(Math.log10(raw))
  const f = raw / p
  const s = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p
  return { max: s * Math.ceil(m / s - 1e-9), step: s }
}


function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(Math.round(el.getBoundingClientRect().width))
    const ro = new ResizeObserver(entries => setWidth(Math.round(entries[0].contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

interface AxesOptions { values: number[]; labels: string[]; w: number; h: number; slots: number; tickFormat?: (v: number) => string }

function axes({ values, labels, w, h, slots, tickFormat = tickK }: AxesOptions) {
  const { max, step } = nice(Math.max(...values, 0))
  const ticks: number[] = []
  for (let t = 0; t <= max + 1e-9; t += step) ticks.push(t)
  const left = 8 + 6.4 * Math.max(...ticks.map(t => tickFormat(t).length))
  const right = 6, top = 20, bottom = 24
  const pw = w - left - right, ph = h - top - bottom, slot = pw / slots
  const y = (v: number) => +(top + ph - (v / max) * ph).toFixed(1)
  const x = (i: number) => +(left + slot * i + slot / 2).toFixed(1)
  const grid = ticks.map(t => (
    <g key={t}>
      <line className={`erp-cg${t === 0 ? " erp-cz" : ""}`} x1={left} x2={w - right} y1={y(t)} y2={y(t)} />
      <text className="erp-ct" x={left - 6} y={y(t) + 4} textAnchor="end">{tickFormat(t)}</text>
    </g>
  ))
  const xl = labels.map((l, i) => (slot >= 22 || i % 2 === 0)
    ? <text key={i} className="erp-ct" x={x(i)} y={h - 7} textAnchor="middle">{l}</text>
    : null)
  return { y, x, slot, grid, xl, base: y(0) }
}

interface ChartProps { values: number[]; labels: string[]; height?: number; label: string; valueFormat?: (v: number) => string; tickFormat?: (v: number) => string }

export function BarChartSvg({ values, labels, height = 210, label, valueFormat, tickFormat }: ChartProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  let body: ReactNode = null
  if (w > 0) {
    const a = axes({ values, labels, w, h: height, slots: labels.length, tickFormat })
    const bw = Math.min(a.slot * 0.58, 44)
    const peak = Math.max(...values)
    body = (
      <svg className="erp-cs" viewBox={`0 0 ${w} ${height}`} width={w} height={height} role="img" aria-label={label}>
        {a.grid}
        {values.map((v, i) => (
          <g key={i}>
            <rect className="erp-cb" x={+(a.x(i) - bw / 2).toFixed(1)} y={a.y(v)} width={+bw.toFixed(1)} height={+(a.base - a.y(v)).toFixed(1)} rx={2} />
            {(a.slot >= 26 || v === peak) && (
              <text className="erp-cv" x={a.x(i)} y={a.y(v) - 5} textAnchor="middle">{valueFormat ? valueFormat(v) : v}</text>
            )}
          </g>
        ))}
        {a.xl}
      </svg>
    )
  }
  return <div ref={ref} style={{ minHeight: height }}>{body}</div>
}

interface LineProps extends ChartProps { slots?: number; showAll?: boolean }

export function LineChartSvg({ values, labels, height = 210, label, valueFormat = valueK, tickFormat, slots, showAll }: LineProps) {
  const [ref, w] = useWidth<HTMLDivElement>()
  let body: ReactNode = null
  if (w > 0) {
    const n = slots ?? values.length
    const a = axes({ values, labels, w, h: height, slots: n, tickFormat })
    const pts = values.map((v, i) => [a.x(i), a.y(v)] as const)
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ")
    const area = `${line} L${pts[pts.length - 1][0]} ${a.base} L${pts[0][0]} ${a.base} Z`
    const peakIndex = values.indexOf(Math.max(...values))
    const shown = showAll ? values.map((_, i) => i) : [...new Set([peakIndex, values.length - 1])]
    body = (
      <svg className="erp-cs" viewBox={`0 0 ${w} ${height}`} width={w} height={height} role="img" aria-label={label}>
        {a.grid}
        <path className="erp-ca" d={area} />
        <path className="erp-cl" d={line} />
        {pts.map((p, i) => <circle key={i} className="erp-cd" cx={p[0]} cy={p[1]} r={4} />)}
        {shown.map(i => {
          const lx = Math.min(Math.max(pts[i][0], a.x(0)), w - 20)
          const low = i > 0 && i < values.length - 1 && values[i] < values[i - 1] && values[i] < values[i + 1]
          return <text key={`v${i}`} className="erp-cv" x={lx} y={low ? pts[i][1] + 19 : pts[i][1] - 10} textAnchor="middle">{valueFormat(values[i])}</text>
        })}
        {a.xl}
      </svg>
    )
  }
  return <div ref={ref} style={{ minHeight: height }}>{body}</div>
}

/** Lista ordenada con barra de proporción en una sola tinta (productos, métodos de pago). */
export function RankList({ rows, label }: { rows: Array<{ name: string; value: number; text: string }>; label: string }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const rowH = 44
  const max = Math.max(...rows.map(r => r.value), 1)
  return (
    <div ref={ref}>
      {w > 0 && (
        <svg className="erp-cs" viewBox={`0 0 ${w} ${rows.length * rowH}`} width={w} height={rows.length * rowH} role="img" aria-label={label}>
          {rows.map((r, i) => {
            const t = i * rowH
            return (
              <g key={r.name}>
                <text className="erp-cn" x={0} y={t + 15}>{r.name}</text>
                <text className="erp-cw" x={w} y={t + 15} textAnchor="end">{r.text}</text>
                <rect className="erp-ctr" x={0} y={t + 24} width={w} height={8} rx={4} />
                <rect className="erp-cb" x={0} y={t + 24} width={Math.max(8, (r.value / max) * w)} height={8} rx={4} />
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}
