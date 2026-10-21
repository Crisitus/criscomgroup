"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchSales } from "../services/saleService"
import { useMemo } from "react"

export const useWeeklySalesData = () => {
  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: fetchSales,
  })

  const weeklySalesData = useMemo(() => {
    if (!sales || sales.length === 0) return null

    // Obtener las últimas 8 semanas
    const now = new Date()
    const weeks = []

    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - i * 7 - now.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      weeks.push({
        start: weekStart,
        end: weekEnd,
        label: `Sem ${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
      })
    }

    // Procesar ventas por semana
    const weeklyData = weeks.map((week) => {
      const weekSales = sales.filter((sale) => {
        const saleDate = new Date(sale.fecha)
        return saleDate >= week.start && saleDate <= week.end
      })

      const totalSales = weekSales.length
      const totalRevenue = weekSales.reduce((sum, sale) => sum + Number.parseFloat(sale.total_con_igv), 0)
      const totalDiscount = weekSales.reduce((sum, sale) => sum + (sale.descuento || 0), 0)

      return {
        week: week.label,
        sales: totalSales,
        revenue: totalRevenue,
        discount: totalDiscount,
      }
    })

    return {
      labels: weeklyData.map((d) => d.week),
      salesData: {
        labels: weeklyData.map((d) => d.week),
        datasets: [
          {
            label: "Ventas",
            data: weeklyData.map((d) => d.sales),
            backgroundColor: "rgba(59, 130, 246, 0.8)",
            borderColor: "rgb(59, 130, 246)",
            borderWidth: 2,
            borderRadius: 6,
            maxBarThickness: 40,
          },
        ],
      },
      discountData: {
        labels: weeklyData.map((d) => d.week),
        datasets: [
          {
            label: "Descuentos (S/)",
            data: weeklyData.map((d) => d.discount),
            backgroundColor: "rgba(239, 68, 68, 0.8)",
            borderColor: "rgb(239, 68, 68)",
            borderWidth: 2,
            borderRadius: 6,
            maxBarThickness: 40,
          },
        ],
      },
      revenueData: {
        labels: weeklyData.map((d) => d.week),
        datasets: [
          {
            label: "Ingresos Semanales",
            data: weeklyData.map((d) => d.revenue),
            borderColor: "rgb(16, 185, 129)",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "rgb(16, 185, 129)",
            pointBorderColor: "rgb(16, 185, 129)",
            pointRadius: 5,
            pointHoverRadius: 7,
          },
        ],
      },
    }
  }, [sales])

  const currentWeekData = useMemo(() => {
    if (!sales || sales.length === 0) return null

    // Obtener el inicio y fin de la semana actual
    const now = new Date()
    const currentWeekStart = new Date(now)
    currentWeekStart.setDate(now.getDate() - now.getDay()) // Domingo
    currentWeekStart.setHours(0, 0, 0, 0)

    const currentWeekEnd = new Date(currentWeekStart)
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6) // Sábado
    currentWeekEnd.setHours(23, 59, 59, 999)

    // Días de la semana
    const daysOfWeek = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

    // Generar datos para cada día de la semana actual
    const dailyData = daysOfWeek.map((dayName, index) => {
      const dayStart = new Date(currentWeekStart)
      dayStart.setDate(currentWeekStart.getDate() + index)
      dayStart.setHours(0, 0, 0, 0)

      const dayEnd = new Date(dayStart)
      dayEnd.setHours(23, 59, 59, 999)

      const daySales = sales.filter((sale) => {
        const saleDate = new Date(sale.fecha)
        return saleDate >= dayStart && saleDate <= dayEnd
      })

      const totalSales = daySales.length
      const totalRevenue = daySales.reduce((sum, sale) => sum + Number.parseFloat(sale.total_con_igv), 0)
      const totalDiscount = daySales.reduce((sum, sale) => sum + (sale.descuento || 0), 0)

      // Marcar si es el día actual
      const isToday = dayStart.toDateString() === now.toDateString()
      const isPastDay = dayStart < now

      return {
        day: dayName,
        fullDate: dayStart,
        sales: totalSales,
        revenue: totalRevenue,
        discount: totalDiscount,
        isToday,
        isPastDay,
      }
    })

    // Calcular totales de la semana actual
    const weekTotals = {
      sales: dailyData.reduce((sum, day) => sum + day.sales, 0),
      revenue: dailyData.reduce((sum, day) => sum + day.revenue, 0),
      discount: dailyData.reduce((sum, day) => sum + day.discount, 0),
    }

    // Datos para gráficos
    return {
      dailyData,
      weekTotals,
      salesData: {
        labels: dailyData.map((d) => d.day),
        datasets: [
          {
            label: "Ventas Diarias",
            data: dailyData.map((d) => d.sales),
            backgroundColor: dailyData.map((d) =>
              d.isToday ? "rgba(59, 130, 246, 1)" : d.isPastDay ? "rgba(59, 130, 246, 0.8)" : "rgba(59, 130, 246, 0.3)",
            ),
            borderColor: "rgb(59, 130, 246)",
            borderWidth: 2,
            borderRadius: 6,
            maxBarThickness: 50,
          },
        ],
      },
      discountData: {
        labels: dailyData.map((d) => d.day),
        datasets: [
          {
            label: "Descuentos Diarios (S/)",
            data: dailyData.map((d) => d.discount),
            backgroundColor: dailyData.map((d) =>
              d.isToday ? "rgba(239, 68, 68, 1)" : d.isPastDay ? "rgba(239, 68, 68, 0.8)" : "rgba(239, 68, 68, 0.3)",
            ),
            borderColor: "rgb(239, 68, 68)",
            borderWidth: 2,
            borderRadius: 6,
            maxBarThickness: 50,
          },
        ],
      },
      revenueData: {
        labels: dailyData.map((d) => d.day),
        datasets: [
          {
            label: "Ingresos Diarios",
            data: dailyData.map((d) => d.revenue),
            borderColor: "rgb(16, 185, 129)",
            backgroundColor: dailyData.map((d) =>
              d.isToday
                ? "rgba(16, 185, 129, 0.3)"
                : d.isPastDay
                  ? "rgba(16, 185, 129, 0.2)"
                  : "rgba(16, 185, 129, 0.1)",
            ),
            fill: true,
            tension: 0.4,
            pointBackgroundColor: dailyData.map((d) => (d.isToday ? "rgb(16, 185, 129)" : "rgba(16, 185, 129, 0.7)")),
            pointBorderColor: "rgb(16, 185, 129)",
            pointRadius: dailyData.map((d) => (d.isToday ? 7 : 5)),
            pointHoverRadius: 9,
          },
        ],
      },
    }
  }, [sales])

  return {
    weeklySalesData,
    currentWeekData,
    isLoading,
  }
}
