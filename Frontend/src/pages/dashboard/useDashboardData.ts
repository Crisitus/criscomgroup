import { useMemo } from "react"
import type { Sale } from "../../services/saleService"
import { MONTHS, addDays, limaDate, mondayOf, saleAmount, shortDate, todayLima } from "../../components/erp/format"

/** Todos los cálculos del Dashboard salen de la lista de ventas ya cargada y se
 *  agrupan por DÍA DE LIMA (la BD guarda UTC), no por la zona del navegador. */
export interface DayStat { date: string; label: string; count: number; discount: number; revenue: number }

const discountOf = (sale: Sale) => (sale.es_descuento && sale.descuento ? Number(sale.descuento) : 0)

export function useDashboardData(sales: Sale[] | undefined) {
  return useMemo(() => {
    const list = sales ?? []
    const today = todayLima()
    const year = Number(today.slice(0, 4))

    const monthlyCount = Array<number>(12).fill(0)
    const monthlyRevenue = Array<number>(12).fill(0)
    const methods = new Map<string, number>()
    const byDay = new Map<string, DayStat>()

    for (const sale of list) {
      const day = limaDate(sale.fecha)
      const amount = saleAmount(sale)
      if (Number(day.slice(0, 4)) === year) {
        const m = Number(day.slice(5, 7)) - 1
        monthlyCount[m] += 1
        monthlyRevenue[m] += amount
      }
      const method = String(sale.metodo_pago || "").toLowerCase()
      methods.set(method, (methods.get(method) || 0) + 1)
      const stat = byDay.get(day) ?? { date: day, label: shortDate(day), count: 0, discount: 0, revenue: 0 }
      stat.count += 1
      stat.discount += discountOf(sale)
      stat.revenue += amount
      byDay.set(day, stat)
    }

    const emptyDay = (date: string): DayStat => ({ date, label: shortDate(date), count: 0, discount: 0, revenue: 0 })
    const dayStat = (date: string) => byDay.get(date) ?? emptyDay(date)

    // Últimas 8 semanas (lunes a domingo), la actual incluida.
    const currentMonday = mondayOf(today)
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const start = addDays(currentMonday, (i - 7) * 7)
      const days = Array.from({ length: 7 }, (_, d) => dayStat(addDays(start, d)))
      return {
        date: start,
        label: shortDate(start),
        count: days.reduce((s, d) => s + d.count, 0),
        discount: days.reduce((s, d) => s + d.discount, 0),
        revenue: days.reduce((s, d) => s + d.revenue, 0),
      }
    })

    // Semana actual: del lunes a hoy.
    const currentDays: DayStat[] = []
    for (let date = currentMonday; date <= today; date = addDays(date, 1)) currentDays.push(dayStat(date))
    const todayStat = dayStat(today)

    const methodTotal = [...methods.values()].reduce((a, b) => a + b, 0)
    const methodRows = [...methods.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count, percent: methodTotal ? (count / methodTotal) * 100 : 0 }))

    // Productos más vendidos: solo si las ventas traen `detalles` (hoy /ventas no los incluye).
    const products = new Map<string, number>()
    for (const sale of list) {
      for (const detail of sale.detalles ?? []) {
        const name = (detail as { producto?: { nombre?: string } }).producto?.nombre
        if (name) products.set(name, (products.get(name) || 0) + Number(detail.cantidad || 0))
      }
    }
    const topProducts = [...products.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

    return {
      today,
      monthly: { count: monthlyCount, revenue: monthlyRevenue, months: MONTHS, lastMonthWithData: Math.max(...monthlyCount.map((c, i) => (c ? i : -1))) },
      methodRows,
      topProducts,
      weeks,
      currentDays,
      currentWeek: {
        today: todayStat,
        total: currentDays.reduce((s, d) => s + d.count, 0),
        discount: currentDays.reduce((s, d) => s + d.discount, 0),
      },
      byDay,
    }
  }, [sales])
}
