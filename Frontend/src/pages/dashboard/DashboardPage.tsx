"use client"

import { useId, useState, type KeyboardEvent } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { ArrowUpFromLine, BarChart3, CalendarDays, ChevronDown, ChevronRight, Clock, DollarSign, LayoutDashboard, Package, ShoppingCart, Tags } from "lucide-react"
import { fetchProducts } from "../../services/productService"
import { fetchCategories } from "../../services/categoryService"
import { fetchSales } from "../../services/saleService"
import { obtenerCierreCajaPorFecha, obtenerCierresCajaPorRango } from "../../services/cierreCajaService"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { useBusinessHours } from "../../hooks/useBusinessHours"
import { BarChartSvg, LineChartSvg, RankList } from "../../components/erp/charts"
import { CashStateChip, DifferenceChip, type CashState } from "../../components/erp/icons"
import { addDays, isBalanced, limaDate, longDate, mondayOf, money, saleAmount, shortDate, signedMoney, todayLima, valueK, weekdayOf } from "../../components/erp/format"
import { useDashboardData } from "./useDashboardData"

const TABS = [
  { label: "Paneles de Control", icon: LayoutDashboard },
  { label: "Análisis Mensual", icon: BarChart3 },
  { label: "Análisis Semanal", icon: CalendarDays },
  { label: "Control Semanal", icon: DollarSign },
] as const

const stroke = { strokeWidth: 1.75, "aria-hidden": true } as const

/** Acción que depende del horario laboral: deshabilitada con reloj y motivo accesible. */
function HoursGatedAction({ enabled, to, icon: Icon, children, message, outline, tipPlacement }: {
  enabled: boolean; to: string; icon: typeof ShoppingCart; children: string; message: string; outline?: boolean; tipPlacement?: string
}) {
  const [show, setShow] = useState(false)
  const tipId = useId()
  const cls = `erp-btn${outline ? " out" : ""}`
  if (enabled) return <Link className={cls} to={to}><Icon size={16} {...stroke} />{children}</Link>
  return (
    <div className={`erp-hw${show ? " show" : ""}`}>
      <button type="button" className={cls} aria-disabled="true" aria-describedby={tipId} onClick={() => setShow(s => !s)}>
        <Clock size={16} {...stroke} />{children}
      </button>
      <span id={tipId} role="tooltip" className={`erp-tp ${tipPlacement ?? ""}`}>
        <b>Fuera del horario laboral</b>
        {message}
      </span>
    </div>
  )
}

function ChartCard({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <section className="erp-card">
      <div className="erp-ch"><div><h2>{title}</h2><small>{caption}</small></div></div>
      {children}
    </section>
  )
}

const DashboardPage = () => {
  useDocumentTitle("Dashboard")
  const { isWithinBusinessHours, businessHoursMessage } = useBusinessHours()
  const [tab, setTab] = useState(0)
  const [selectedDate, setSelectedDate] = useState(todayLima)
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayLima()))
  const tabsId = useId()

  const { data: products, isLoading: loadingProducts } = useQuery({ queryKey: ["products"], queryFn: fetchProducts })
  const { data: categories, isLoading: loadingCategories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories })
  const { data: sales, isLoading: loadingSales } = useQuery({ queryKey: ["sales"], queryFn: fetchSales })
  const { data: dayClosings } = useQuery({ queryKey: ["cierreCaja", selectedDate], queryFn: () => obtenerCierreCajaPorFecha(selectedDate), enabled: !!selectedDate })
  const weekEnd = addDays(weekStart, 6)
  const { data: weekClosings, isLoading: loadingWeekClosings } = useQuery({
    queryKey: ["weeklyCierres", weekStart],
    queryFn: () => obtenerCierresCajaPorRango(weekStart, weekEnd),
    enabled: !!weekStart && tab === 3,
  })

  const data = useDashboardData(sales)
  const loading = loadingProducts || loadingCategories || loadingSales
  const totalRevenue = (sales ?? []).reduce((sum, sale) => sum + Number.parseFloat(sale.total_con_igv), 0)

  const closingFor = (closings: unknown, date: string) => {
    const list = Array.isArray(closings) ? closings : closings ? [closings] : []
    return list.find((c: { fecha_apertura?: string }) => String(c.fecha_apertura ?? "").startsWith(date)) as { estado?: string; saldo_efectivo?: string | number } | undefined
  }

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === "ArrowRight" ? index + 1 : event.key === "ArrowLeft" ? index - 1 : event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : null
    if (next === null) return
    event.preventDefault()
    const target = (next + TABS.length) % TABS.length
    setTab(target)
    document.getElementById(`${tabsId}-tab-${target}`)?.focus()
  }

  const kpis = [
    { label: "Productos", value: String(products?.length ?? 0), to: "/products" },
    { label: "Categorías", value: String(categories?.length ?? 0), to: "/categories" },
    { label: "Ventas", value: String(sales?.length ?? 0), to: "/sales" },
    { label: "Ingresos totales", value: money(totalRevenue), to: "/sales" },
  ]

  // ---------- Paneles ----------
  const daySales = (sales ?? []).filter(sale => limaDate(sale.fecha) === selectedDate)
  const dayTotal = daySales.reduce((sum, sale) => sum + saleAmount(sale), 0)
  const dayClosing = closingFor(dayClosings, selectedDate)
  const dayCash = dayClosing ? Number(dayClosing.saldo_efectivo) || 0 : null
  const dayDifference = dayTotal - (dayCash ?? 0)
  const dayState: CashState = dayClosing ? (dayClosing.estado === "cerrado" ? "cerrado" : "abierto") : "sin cierre"

  const panels = (
    <div className="erp-pgrid">
      <section className="erp-card erp-gc" aria-labelledby="caja-diaria-titulo">
        <div className="erp-ch">
          <div><h2 id="caja-diaria-titulo">Control de Caja Diaria</h2><small>Ventas del día frente al efectivo en caja</small></div>
          <input className="erp-date" type="date" value={selectedDate} onChange={e => e.target.value && setSelectedDate(e.target.value)} aria-label="Fecha de la caja" />
        </div>
        <div className="erp-cj">
          <div className="erp-cm">
            <div className="l">Total Ventas del Día</div>
            <div className="v erp-num">{money(dayTotal)}</div>
            <div className="s"><span>{daySales.length} transacciones</span><span className="erp-tag">Sistema</span></div>
          </div>
          <div className="erp-cm">
            <div className="l">Efectivo Disponible en Caja</div>
            <div className="v erp-num">{dayCash === null ? "—" : money(dayCash)}</div>
            <div className="s"><CashStateChip estado={dayState} /></div>
          </div>
          <div className="erp-cm">
            <div className="l">Diferencia</div>
            <div className={`v erp-num ${isBalanced(dayDifference) ? "ok" : "bad"}`}>{isBalanced(dayDifference) ? money(0) : signedMoney(dayDifference)}</div>
            <div className="s"><DifferenceChip difference={dayDifference} /></div>
          </div>
        </div>
        {Math.abs(dayDifference) > 1 && (
          <div className="erp-note">
            <span>Una diferencia mayor a S/ 1.00 requiere revisión</span>
            <Link className="erp-lnk" to="/cash-register">Caja Diaria<ChevronRight size={16} {...stroke} /></Link>
          </div>
        )}
      </section>

      <section className="erp-card erp-gr">
        <div className="erp-ch"><h2>Ventas Recientes</h2>{!!sales?.length && <Link className="erp-lnk" to="/sales">Ver todas<ChevronRight size={16} {...stroke} /></Link>}</div>
        {loadingSales ? (
          <div className="erp-empty" aria-busy="true">Cargando…</div>
        ) : sales?.length ? (
          <ul className="erp-rl">
            {sales.slice(0, 5).map(sale => (
              <li key={sale.venta_id}>
                <Link className="erp-rw" to={`/sales/${sale.venta_id}`}>
                  <span className="a">Venta #{sale.venta_id}<span className="erp-tag">{sale.metodo_pago}</span><span className="dt erp-num">{longDate(limaDate(sale.fecha))}</span></span>
                  <span className="m erp-num">{money(Number.parseFloat(sale.total_con_igv))}</span>
                  <ChevronRight size={16} {...stroke} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="erp-empty">No hay ventas registradas aún.</div>
        )}
      </section>

      <details className="erp-acc erp-ga">
        <summary>Acciones rápidas<ChevronDown className="erp-chev" size={16} {...stroke} /></summary>
        <div className="erp-acts">
          <Link className="erp-btn out" to="/products"><Package size={16} {...stroke} />Gestionar Productos</Link>
          <Link className="erp-btn out" to="/categories"><Tags size={16} {...stroke} />Gestionar Categorías</Link>
          <HoursGatedAction enabled={isWithinBusinessHours} to="/sales" icon={ArrowUpFromLine} message={businessHoursMessage} outline tipPlacement="up l">Registrar Venta</HoursGatedAction>
          <Link className="erp-btn out" to="/sales"><ShoppingCart size={16} {...stroke} />Ver Historial de Ventas</Link>
        </div>
      </details>
    </div>
  )

  // ---------- Análisis mensual ----------
  const { monthly, methodRows, topProducts } = data
  const hasMonthly = monthly.count.some(c => c > 0)
  const revenueSeries = monthly.revenue.slice(0, monthly.lastMonthWithData + 1)
  const monthly_ = !hasMonthly ? (
    <div className="erp-card"><div className="erp-empty">No hay datos de ventas mensuales disponibles</div></div>
  ) : (
    <div className="erp-gm">
      <ChartCard title="Ventas Mensuales" caption="N.º de ventas por mes, año actual">
        <BarChartSvg values={monthly.count} labels={monthly.months} label={`Ventas por mes: ${monthly.months.map((m, i) => `${m} ${monthly.count[i]}`).join(", ")}`} />
      </ChartCard>
      <ChartCard title="Ingresos Mensuales" caption="Ingresos en S/ por mes, año actual">
        <LineChartSvg values={revenueSeries} labels={monthly.months} slots={12} valueFormat={valueK} label="Ingresos por mes en soles" />
      </ChartCard>
      {topProducts.length > 0 && (
        <ChartCard title="Productos Más Vendidos" caption="Unidades vendidas, top 5">
          <RankList rows={topProducts.map(([name, units]) => ({ name, value: units, text: `${units} u.` }))} label={`Productos más vendidos: ${topProducts.map(([n, u]) => `${n} ${u}`).join(", ")}`} />
        </ChartCard>
      )}
      <div style={topProducts.length ? undefined : { gridColumn: "1 / -1" }}>
        <ChartCard title="Métodos de Pago" caption="Ventas por método y % del total">
          <RankList rows={methodRows.map(r => ({ name: r.name, value: r.count, text: `${r.count} · ${r.percent.toFixed(1)}%` }))} label={`Métodos de pago: ${methodRows.map(r => `${r.name} ${r.count}`).join(", ")}`} />
        </ChartCard>
      </div>
    </div>
  )

  // ---------- Análisis semanal ----------
  const { weeks, currentDays, currentWeek } = data
  const weekly = !sales?.length ? (
    <div className="erp-card"><div className="erp-empty">No hay datos de ventas semanales disponibles</div></div>
  ) : (
    <>
      <h2 className="erp-sec">Últimas 8 semanas</h2>
      <div className="erp-g6">
        <ChartCard title="Ventas Semanales" caption="N.º de ventas por semana">
          <BarChartSvg values={weeks.map(w => w.count)} labels={weeks.map(w => w.label)} label={`Ventas por semana: ${weeks.map(w => `${w.label} ${w.count}`).join(", ")}`} />
        </ChartCard>
        <ChartCard title="Descuentos Semanales" caption="Descuentos en S/ por semana">
          <BarChartSvg values={weeks.map(w => w.discount)} labels={weeks.map(w => w.label)} valueFormat={v => String(Math.round(v))} label={`Descuentos por semana en soles: ${weeks.map(w => `${w.label} ${Math.round(w.discount)}`).join(", ")}`} />
        </ChartCard>
        <ChartCard title="Ingresos Semanales" caption="Ingresos en S/ por semana">
          <LineChartSvg values={weeks.map(w => w.revenue)} labels={weeks.map(w => w.label)} showAll label={`Ingresos por semana en soles: ${weeks.map(w => `${w.label} ${Math.round(w.revenue)}`).join(", ")}`} />
        </ChartCard>
      </div>
      <h2 className="erp-sec">Semana Actual</h2>
      <div className="erp-strip c4">
        <div className="erp-cell"><span className="r1"><span>Ventas de Hoy</span></span><span className="v erp-num">{currentWeek.today.count}</span></div>
        <div className="erp-cell"><span className="r1"><span>Ingresos de Hoy</span></span><span className="v erp-num">{money(currentWeek.today.revenue)}</span></div>
        <div className="erp-cell"><span className="r1"><span>Total Semana</span></span><span className="v erp-num">{currentWeek.total}</span></div>
        <div className="erp-cell"><span className="r1"><span>Descuentos Semana</span></span><span className="v erp-num">{money(currentWeek.discount)}</span></div>
      </div>
      <div className="erp-g6">
        <ChartCard title="Ventas por Día" caption="N.º de ventas por día">
          <BarChartSvg values={currentDays.map(d => d.count)} labels={currentDays.map(d => d.label)} label={`Ventas por día: ${currentDays.map(d => `${d.label} ${d.count}`).join(", ")}`} />
        </ChartCard>
        <ChartCard title="Descuentos por Día" caption="Descuentos en S/ por día">
          <BarChartSvg values={currentDays.map(d => d.discount)} labels={currentDays.map(d => d.label)} valueFormat={v => String(Math.round(v))} label={`Descuentos por día en soles: ${currentDays.map(d => `${d.label} ${Math.round(d.discount)}`).join(", ")}`} />
        </ChartCard>
        <ChartCard title="Ingresos por Día" caption="Ingresos en S/ por día">
          <LineChartSvg values={currentDays.map(d => d.revenue)} labels={currentDays.map(d => d.label)} showAll label={`Ingresos por día en soles: ${currentDays.map(d => `${d.label} ${Math.round(d.revenue)}`).join(", ")}`} />
        </ChartCard>
      </div>
    </>
  )

  // ---------- Control semanal ----------
  const weekRows = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i)
    const stat = data.byDay.get(date)
    const closing = closingFor(weekClosings, date)
    const sold = stat?.revenue ?? 0
    const count = stat?.count ?? 0
    const cash = closing ? Number(closing.saldo_efectivo) || 0 : null
    const state: CashState = closing ? (closing.estado === "cerrado" ? "cerrado" : "abierto") : count === 0 ? "sin actividad" : "sin cierre"
    const difference = state === "sin actividad" ? null : sold - (cash ?? 0)
    return { date, label: `${weekdayOf(date)} ${shortDate(date)}`, sold, count, cash, state, difference }
  })
  const weekSold = weekRows.reduce((s, r) => s + r.sold, 0)
  const weekCount = weekRows.reduce((s, r) => s + r.count, 0)
  const weekCash = weekRows.reduce((s, r) => s + (r.cash ?? 0), 0)
  const weekClosed = weekRows.filter(r => r.cash !== null).length
  const weekDifference = weekSold - weekCash

  const control = (
    <>
      <div className="erp-sel">
        <label htmlFor={`${tabsId}-semana`}>Semana del lunes</label>
        <input className="erp-date" id={`${tabsId}-semana`} type="date" value={weekStart} onChange={e => e.target.value && setWeekStart(e.target.value)} title="Seleccionar inicio de semana (lunes)" />
        <span className="erp-cap erp-num">{shortDate(weekStart)} – {longDate(weekEnd)}</span>
      </div>
      {loadingWeekClosings ? (
        <div className="erp-card"><div className="erp-empty" aria-busy="true">Cargando…</div></div>
      ) : (
        <>
          <div className="erp-strip c3">
            <div className="erp-cell"><span className="r1"><span>Total Ventas Semana</span></span><span className="v erp-num">{money(weekSold)}</span><span className="s">{weekCount} transacciones</span></div>
            <div className="erp-cell"><span className="r1"><span>Efectivo Total Semana</span></span><span className="v erp-num">{money(weekCash)}</span><span className="s">{weekClosed} cierres con efectivo</span></div>
            <div className="erp-cell">
              <span className="r1"><span>Diferencia Semanal</span></span>
              <span className="v erp-num" style={{ color: `hsl(var(--${isBalanced(weekDifference) ? "success" : "destructive"}-text))` }}>{isBalanced(weekDifference) ? money(0) : signedMoney(weekDifference)}</span>
              <span className="s">{isBalanced(weekDifference) ? <span className="erp-st ok">Semana cuadrada</span> : <DifferenceChip difference={weekDifference} />}</span>
            </div>
          </div>
          <div className="erp-card tbc erp-only-desk">
            <table className="erp-tb">
              <caption className="erp-sr">Control de caja semanal, del {shortDate(weekStart)} al {shortDate(weekEnd)}</caption>
              <colgroup><col style={{ width: "15%" }} /><col style={{ width: "22%" }} /><col style={{ width: "23%" }} /><col style={{ width: "17%" }} /><col style={{ width: "23%" }} /></colgroup>
              <thead><tr><th scope="col">Día</th><th scope="col" className="r">Ventas Sistema</th><th scope="col" className="r">Efectivo en Caja</th><th scope="col">Estado</th><th scope="col" className="r">Diferencia</th></tr></thead>
              <tbody>
                {weekRows.map(r => (
                  <tr key={r.date} className={r.state === "sin actividad" ? "zero" : ""}>
                    <td><div className="a">{r.label}</div></td>
                    <td className="r"><div className="a erp-num">{money(r.sold)}</div><div className="b">{r.count} ventas</div></td>
                    <td className="r">{r.cash === null ? <div className="a">—</div> : <><div className="a erp-num">{money(r.cash)}</div><div className="b">efectivo disponible</div></>}</td>
                    <td><CashStateChip estado={r.state} /></td>
                    <td className="r">{r.difference === null ? <div className="a">—</div> : <><div className="a erp-num">{signedMoney(r.difference)}</div><div><DifferenceChip difference={r.difference} /></div></>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="erp-dlist erp-only-mob">
            {weekRows.map(r => (
              <article key={r.date} className={`erp-dc${r.state === "sin actividad" ? " zero" : ""}`}>
                <div className="erp-dh"><span>{r.label}</span><CashStateChip estado={r.state} /></div>
                {r.state !== "sin actividad" && (
                  <div className="erp-dg">
                    <div><div className="l">Ventas Sistema</div><div className="v erp-num">{money(r.sold)}</div><div className="l">{r.count} ventas</div></div>
                    <div><div className="l">Efectivo en Caja</div><div className="v erp-num">{r.cash === null ? "—" : money(r.cash)}</div></div>
                    <div><div className="l">Diferencia</div><div className="v erp-num">{r.difference === null ? "—" : signedMoney(r.difference)}</div>{r.difference !== null && <DifferenceChip difference={r.difference} />}</div>
                  </div>
                )}
              </article>
            ))}
          </div>
          <p className="erp-cap">Los días sin actividad aparecen sombreados; el resumen incluye solo días con datos.</p>
        </>
      )}
    </>
  )

  return (
    <div className="erp-page">
      <div className="erp-hd">
        <h1>Dashboard</h1>
        <HoursGatedAction enabled={isWithinBusinessHours} to="/sales" icon={ShoppingCart} message={businessHoursMessage}>Ventas</HoursGatedAction>
      </div>

      <div className="erp-strip c4">
        {kpis.map(k => (
          <Link key={k.label} className="erp-cell" to={k.to}>
            <span className="r1"><span>{k.label}</span><span className="go"><b>Ver</b><ChevronRight size={16} {...stroke} /></span></span>
            {loading ? <span className="v erp-num ld" aria-busy="true">...<span className="erp-sr"> cargando</span></span> : <span className="v erp-num">{k.value}</span>}
          </Link>
        ))}
      </div>

      <div className="erp-tabs" role="tablist" aria-label="Secciones del Dashboard">
        {TABS.map((t, i) => (
          <button key={t.label} id={`${tabsId}-tab-${i}`} role="tab" type="button" className="erp-tab" aria-selected={tab === i} aria-controls={`${tabsId}-panel`} tabIndex={tab === i ? 0 : -1} onClick={() => setTab(i)} onKeyDown={e => onTabKey(e, i)}>
            <t.icon size={16} {...stroke} /><span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="erp-panel" role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-tab-${tab}`} tabIndex={0}>
        {tab === 0 && panels}
        {tab === 1 && monthly_}
        {tab === 2 && weekly}
        {tab === 3 && control}
      </div>
    </div>
  )
}

export default DashboardPage
