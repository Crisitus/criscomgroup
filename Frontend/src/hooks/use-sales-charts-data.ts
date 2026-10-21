"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchSales } from "../services/saleService"
import { fetchCategories } from "../services/categoryService"

// Función para obtener los nombres de los meses en español
const getMonthName = (monthIndex: number): string => {
  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ]
  return months[monthIndex]
}

// Función para generar colores aleatorios
const generateRandomColors = (count: number): string[] => {
  const baseColors = [
    "rgba(99, 102, 241, 0.8)", // Indigo
    "rgba(139, 92, 246, 0.8)", // Purple
    "rgba(236, 72, 153, 0.8)", // Pink
    "rgba(16, 185, 129, 0.8)", // Emerald
    "rgba(245, 158, 11, 0.8)", // Amber
    "rgba(239, 68, 68, 0.8)", // Red
    "rgba(59, 130, 246, 0.8)", // Blue
    "rgba(20, 184, 166, 0.8)", // Teal
    "rgba(217, 70, 239, 0.8)", // Fuchsia
    "rgba(251, 146, 60, 0.8)", // Orange
  ]

  const colors: string[] = []
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length])
  }

  return colors
}

export const useSalesChartsData = () => {
  // Estados para los datos de los gráficos
  const [monthlySalesData, setMonthlySalesData] = useState<any>(null)
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<any>(null)
  const [topProductsData, setTopProductsData] = useState<any>(null)
  const [paymentMethodData, setPaymentMethodData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Obtener datos de ventas
  const { data: sales, isLoading: isLoadingSales } = useQuery({
    queryKey: ["sales"],
    queryFn: fetchSales,
  })

  // Obtener datos de categorías
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  })

  useEffect(() => {
    if (sales && categories) {
      if (sales.length > 0) {
        // Procesar datos para ventas mensuales
        processMonthlySalesData(sales)

        // Procesar datos para ingresos mensuales
        processMonthlyRevenueData(sales)

        // Procesar datos para ventas por categoría
        processTopProductsData(sales)

        // Procesar datos para métodos de pago
        processPaymentMethodData(sales)
      } else {
        // Si no hay ventas, establecer datos como null

        setMonthlySalesData(null)
        setMonthlyRevenueData(null)
        setTopProductsData(null)
        setPaymentMethodData(null)
      }

      setIsLoading(false)
    }
  }, [sales, categories])

  // Procesar datos para el gráfico de ventas mensuales
  const processMonthlySalesData = (sales: any[]) => {
    // Verificar si hay ventas
    if (!sales || sales.length === 0) {
      setMonthlySalesData(null)
      return
    }

    // Obtener el año actual
    const currentYear = new Date().getFullYear()

    // Inicializar contadores para cada mes
    const monthlyCounts = Array(12).fill(0)

    // Contar ventas por mes
    sales.forEach((sale) => {
      const saleDate = new Date(sale.fecha)
      if (saleDate.getFullYear() === currentYear) {
        monthlyCounts[saleDate.getMonth()]++
      }
    })

    // Verificar si hay datos para mostrar
    if (monthlyCounts.every((count) => count === 0)) {
      setMonthlySalesData(null)
      return
    }

    // Crear etiquetas para los meses
    const labels = Array.from({ length: 12 }, (_, i) => getMonthName(i))

    // Configurar datos para el gráfico
    setMonthlySalesData({
      labels,
      datasets: [
        {
          label: "Ventas",
          data: monthlyCounts,
          backgroundColor: "rgba(99, 102, 241, 0.7)",
          borderColor: "rgb(99, 102, 241)",
          borderWidth: 1,
        },
      ],
    })
  }

  // Procesar datos para el gráfico de ingresos mensuales
  const processMonthlyRevenueData = (sales: any[]) => {
    // Verificar si hay ventas
    if (!sales || sales.length === 0) {
      setMonthlyRevenueData(null)
      return
    }
    // Obtener el año actual
    const currentYear = new Date().getFullYear()

    // Inicializar ingresos para cada mes
    const monthlyRevenue = Array(12).fill(0)

    // Sumar ingresos por mes
    sales.forEach((sale) => {
      const saleDate = new Date(sale.fecha)
      if (saleDate.getFullYear() === currentYear) {
        monthlyRevenue[saleDate.getMonth()] += Number.parseFloat(sale.total_con_igv)
      }
    })

    // Verificar si hay datos para mostrar
    if (monthlyRevenue.every((revenue) => revenue === 0)) {
      setMonthlyRevenueData(null)
      return
    }

    // Crear etiquetas para los meses
    const labels = Array.from({ length: 12 }, (_, i) => getMonthName(i))

    // Configurar datos para el gráfico
    setMonthlyRevenueData({
      labels,
      datasets: [
        {
          label: "Ingresos (S/)",
          data: monthlyRevenue,
          borderColor: "rgb(139, 92, 246)",
          backgroundColor: "rgba(139, 92, 246, 0.2)",
          fill: true,
          tension: 0.4,
        },
      ],
    })
  }

  // Procesar datos para el gráfico de productos más vendidos
  const processTopProductsData = (sales: any[]) => {
    // Verificar si hay ventas
    if (!sales || sales.length === 0) {
      setTopProductsData(null)
      return
    }

    // Crear un mapa para contar ventas por producto
    const productSales: Record<string, { count: number; revenue: number }> = {}

    // Contar ventas por producto
    sales.forEach((sale) => {
      if (sale.detalles && Array.isArray(sale.detalles)) {
        sale.detalles.forEach((detail: any) => {
          if (detail.producto) {
            const productName = detail.producto.nombre
            if (!productSales[productName]) {
              productSales[productName] = { count: 0, revenue: 0 }
            }
            productSales[productName].count += detail.cantidad
            productSales[productName].revenue += Number.parseFloat(detail.precio_unitario) * detail.cantidad
          }
        })
      }
    })

    // Verificar si no hay productos vendidos
    if (Object.keys(productSales).length === 0) {
      setTopProductsData(null)
      return
    }

    // Ordenar productos por cantidad vendida y tomar los 5 principales
    const sortedProducts = Object.entries(productSales)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)

    const productNames = sortedProducts.map(([name]) => name)
    const productCounts = sortedProducts.map(([, data]) => data.count)

    // Generar colores para cada producto
    const backgroundColors = generateRandomColors(productNames.length)

    // Configurar datos para el gráfico
    setTopProductsData({
      labels: productNames,
      datasets: [
        {
          label: "Unidades Vendidas",
          data: productCounts,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors.map((color) => color.replace("0.8", "1")),
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 40,
        },
      ],
    })
  }

  // Procesar datos para el gráfico de métodos de pago
  const processPaymentMethodData = (sales: any[]) => {
    if (!sales || sales.length === 0) {
      setPaymentMethodData(null)
      return
    }
    // Inicializar contadores para cada método de pago
    const paymentMethods: Record<string, number> = {}

    // Contar ventas por método de pago
    sales.forEach((sale) => {
      const method = sale.metodo_pago || "Desconocido"
      paymentMethods[method] = (paymentMethods[method] || 0) + 1
    })

    // Verificar si no hay métodos de pago
    if (Object.keys(paymentMethods).length === 0) {
      setPaymentMethodData(null)
      return
    }

    // Obtener nombres de métodos y conteos
    const methodNames = Object.keys(paymentMethods)
    const counts = methodNames.map((name) => paymentMethods[name])

    // Generar colores para cada método
    const backgroundColors = [
      "rgba(236, 72, 153, 0.7)", // Pink
      "rgba(16, 185, 129, 0.7)", // Emerald
      "rgba(245, 158, 11, 0.7)", // Amber
      "rgba(59, 130, 246, 0.7)", // Blue
    ]

    // Configurar datos para el gráfico
    setPaymentMethodData({
      labels: methodNames,
      datasets: [
        {
          label: "Ventas por Método de Pago",
          data: counts,
          backgroundColor: backgroundColors.slice(0, methodNames.length),
          borderColor: backgroundColors.slice(0, methodNames.length).map((color) => color.replace("0.7", "1")),
          borderWidth: 1,
        },
      ],
    })
  }

  return {
    monthlySalesData,
    monthlyRevenueData,
    topProductsData,
    paymentMethodData,
    isLoading: isLoading || isLoadingSales || isLoadingCategories,
  }
}
