import api from "../lib/api"
import type { Sale } from "./saleService"

export interface WeeklySalesStats {
  week: string
  totalSales: number
  totalRevenue: number
  totalDiscount: number
  averageTicket: number
}

export interface WeeklySalesResponse {
  currentWeek: WeeklySalesStats
  previousWeeks: WeeklySalesStats[]
  weeklyComparison: {
    salesGrowth: number
    revenueGrowth: number
    discountGrowth: number
  }
}

// Función para obtener estadísticas de ventas semanales
export const fetchWeeklySalesStats = async (): Promise<WeeklySalesResponse> => {
  try {
    // En una aplicación real, esto sería una llamada a la API
    // const response = await api.get('/ventas/estadisticas-semanales')
    // return response.data

    // Por ahora, procesamos los datos localmente
    const salesResponse = await api.get("/ventas")
    const sales: Sale[] = salesResponse.data

    return processWeeklySalesData(sales)
  } catch (error) {
    console.error("Error fetching weekly sales stats:", error)
    throw error
  }
}

// Función para procesar datos de ventas semanales
const processWeeklySalesData = (sales: Sale[]): WeeklySalesResponse => {
  const now = new Date()
  const currentWeekStart = new Date(now)
  currentWeekStart.setDate(now.getDate() - now.getDay())
  currentWeekStart.setHours(0, 0, 0, 0)

  const currentWeekEnd = new Date(currentWeekStart)
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6)
  currentWeekEnd.setHours(23, 59, 59, 999)

  // Generar últimas 8 semanas
  const weeks = []
  for (let i = 0; i < 8; i++) {
    const weekStart = new Date(currentWeekStart)
    weekStart.setDate(currentWeekStart.getDate() - i * 7)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    weeks.push({ start: weekStart, end: weekEnd })
  }

  const weeklyStats = weeks.map((week) => {
    const weekSales = sales.filter((sale) => {
      const saleDate = new Date(sale.fecha)
      return saleDate >= week.start && saleDate <= week.end
    })

    const totalSales = weekSales.length
    const totalRevenue = weekSales.reduce((sum, sale) => sum + Number.parseFloat(sale.total_con_igv), 0)
    const totalDiscount = weekSales.reduce((sum, sale) => sum + (sale.descuento || 0), 0)
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0

    return {
      week: `Semana ${week.start.getDate()}/${week.start.getMonth() + 1}`,
      totalSales,
      totalRevenue,
      totalDiscount,
      averageTicket,
    }
  })

  const currentWeek = weeklyStats[0]
  const previousWeek = weeklyStats[1]

  const salesGrowth =
    previousWeek.totalSales > 0
      ? ((currentWeek.totalSales - previousWeek.totalSales) / previousWeek.totalSales) * 100
      : 0

  const revenueGrowth =
    previousWeek.totalRevenue > 0
      ? ((currentWeek.totalRevenue - previousWeek.totalRevenue) / previousWeek.totalRevenue) * 100
      : 0

  const discountGrowth =
    previousWeek.totalDiscount > 0
      ? ((currentWeek.totalDiscount - previousWeek.totalDiscount) / previousWeek.totalDiscount) * 100
      : 0

  return {
    currentWeek,
    previousWeeks: weeklyStats.slice(1),
    weeklyComparison: {
      salesGrowth,
      revenueGrowth,
      discountGrowth,
    },
  }
}

// Función para obtener ventas por rango de fechas semanal
export const fetchSalesByWeekRange = async (weeksBack = 8): Promise<Sale[]> => {
  try {
    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(now.getDate() - weeksBack * 7)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(now)
    endDate.setHours(23, 59, 59, 999)

    const response = await api.get("/ventas/rango-fechas", {
      params: {
        fechaInicio: startDate.toISOString().split("T")[0],
        fechaFin: endDate.toISOString().split("T")[0],
      },
    })

    return response.data
  } catch (error) {
    console.error("Error fetching sales by week range:", error)
    throw error
  }
}
