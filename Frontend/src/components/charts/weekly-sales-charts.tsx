"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { BarChart } from "./bar-chart"
import { LineChart } from "./line-chart"
import { useWeeklySalesData } from "../../hooks/use-weekly-sales-data"
import { TrendingUp, TrendingDown, Calendar, DollarSign } from "lucide-react"
import { CurrentWeekAnalysis } from "./current-week-analysis"

export function WeeklySalesCharts() {
  const { weeklySalesData, isLoading } = useWeeklySalesData()

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-0 shadow-lg">
            <CardHeader>
              <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
              <div className="h-3 bg-muted animate-pulse rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted animate-pulse rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!weeklySalesData) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay datos de ventas semanales disponibles</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Título de la sección */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-3"
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground">Análisis Semanal</h3>
          <p className="text-sm text-muted-foreground">Últimas 8 semanas de actividad</p>
        </div>
      </motion.div>

      {/* Gráficos principales */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Gráfico de Ventas Semanales */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Ventas Semanales
              </CardTitle>
              <CardDescription>Número de transacciones por semana</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: "280px" }} className="p-2">
                <BarChart title="" data={weeklySalesData.salesData} height={280} animationDelay={0.1} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Gráfico de Descuentos Semanales */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 to-pink-600"></div>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Descuentos Semanales
              </CardTitle>
              <CardDescription>Total de descuentos aplicados por semana</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: "280px" }} className="p-2">
                <BarChart title="" data={weeklySalesData.discountData} height={280} animationDelay={0.2} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Gráfico de Ingresos Semanales */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-green-600"></div>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Ingresos Semanales
              </CardTitle>
              <CardDescription>Tendencia de ingresos por semana</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: "280px" }} className="p-2">
                <LineChart title="" data={weeklySalesData.revenueData} height={280} animationDelay={0.3} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Análisis de la semana actual */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <CurrentWeekAnalysis />
      </motion.div>
    </div>
  )
}
