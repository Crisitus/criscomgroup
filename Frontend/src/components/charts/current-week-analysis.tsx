"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Bar, Line } from "react-chartjs-2"
import { useWeeklySalesData } from "../../hooks/use-weekly-sales-data"
import { formatCurrency } from "../../lib/utils"
import { Calendar, TrendingDown, DollarSign, ShoppingCart, Target, Clock } from "lucide-react"

export function CurrentWeekAnalysis() {
  const { currentWeekData, isLoading } = useWeeklySalesData()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-muted animate-pulse rounded w-1/3"></div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="h-16 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-0 shadow-lg">
              <CardHeader>
                <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!currentWeekData) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay datos de la semana actual disponibles</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const today = new Date()
  const todayData = currentWeekData.dailyData.find((day) => day.isToday)

  return (
    <div className="space-y-6">
      {/* Título de la sección */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-3"
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-foreground">Semana Actual</h3>
          <p className="text-sm text-muted-foreground">
            Análisis día por día •{" "}
            {today.toLocaleDateString("es-ES", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </motion.div>

      {/* Resumen de la semana actual */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ventas de Hoy</p>
                  <p className="text-2xl font-bold text-foreground">{todayData?.sales || 0}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-green-600"></div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ingresos de Hoy</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(todayData?.revenue || 0)}</p>
                </div>
                <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-violet-600"></div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Semana</p>
                  <p className="text-2xl font-bold text-foreground">{currentWeekData.weekTotals.sales}</p>
                </div>
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 to-pink-600"></div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Descuentos Semana</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(currentWeekData.weekTotals.discount)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Gráficos diarios */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Ventas Diarias */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Card className="border-0 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                Ventas por Día
              </CardTitle>
              <CardDescription>Transacciones diarias de esta semana</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: "280px" }} className="p-2">
                <Bar
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                      tooltip: {
                        backgroundColor: "rgba(59, 130, 246, 0.9)",
                        titleColor: "#ffffff",
                        bodyColor: "#ffffff",
                        borderColor: "rgba(59, 130, 246, 0.3)",
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                          afterLabel: (context) => {
                            const dayData = currentWeekData.dailyData[context.dataIndex]
                            if (dayData.isToday) return "📅 Hoy"
                            if (!dayData.isPastDay) return "⏳ Pendiente"
                            return ""
                          },
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: { font: { size: 11 } },
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: "rgba(229, 231, 235, 0.7)" },
                        ticks: { font: { size: 11 } },
                      },
                    },
                    animation: {
                      duration: 1000,
                      easing: "easeOutQuart",
                    },
                  }}
                  data={currentWeekData.salesData}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Descuentos Diarios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Card className="border-0 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 to-pink-600"></div>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Descuentos por Día
              </CardTitle>
              <CardDescription>Descuentos aplicados diariamente</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: "280px" }} className="p-2">
                <Bar
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                      tooltip: {
                        backgroundColor: "rgba(239, 68, 68, 0.9)",
                        titleColor: "#ffffff",
                        bodyColor: "#ffffff",
                        borderColor: "rgba(239, 68, 68, 0.3)",
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                          label: (context) => {
                            return `Descuentos: ${formatCurrency(context.parsed.y)}`
                          },
                          afterLabel: (context) => {
                            const dayData = currentWeekData.dailyData[context.dataIndex]
                            if (dayData.isToday) return "📅 Hoy"
                            if (!dayData.isPastDay) return "⏳ Pendiente"
                            return ""
                          },
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: { font: { size: 11 } },
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: "rgba(229, 231, 235, 0.7)" },
                        ticks: {
                          font: { size: 11 },
                          callback: (value) => {
                            if (typeof value === "number") {
                              return "S/ " + value.toLocaleString("es-PE")
                            }
                            return value
                          },
                        },
                      },
                    },
                    animation: {
                      duration: 1200,
                      easing: "easeOutQuart",
                    },
                  }}
                  data={currentWeekData.discountData}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Ingresos Diarios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <Card className="border-0 shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-green-600"></div>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Ingresos por Día
              </CardTitle>
              <CardDescription>Tendencia de ingresos diarios</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: "280px" }} className="p-2">
                <Line
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                      tooltip: {
                        backgroundColor: "rgba(16, 185, 129, 0.9)",
                        titleColor: "#ffffff",
                        bodyColor: "#ffffff",
                        borderColor: "rgba(16, 185, 129, 0.3)",
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                          label: (context) => {
                            return `Ingresos: ${formatCurrency(context.parsed.y)}`
                          },
                          afterLabel: (context) => {
                            const dayData = currentWeekData.dailyData[context.dataIndex]
                            if (dayData.isToday) return "📅 Hoy"
                            if (!dayData.isPastDay) return "⏳ Pendiente"
                            return ""
                          },
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: { font: { size: 11 } },
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: "rgba(229, 231, 235, 0.7)" },
                        ticks: {
                          font: { size: 11 },
                          callback: (value) => {
                            if (typeof value === "number") {
                              return "S/ " + value.toLocaleString("es-PE")
                            }
                            return value
                          },
                        },
                      },
                    },
                    animation: {
                      duration: 1500,
                      easing: "easeOutQuart",
                    },
                    elements: {
                      line: { tension: 0.4 },
                      point: { radius: 5, hoverRadius: 8 },
                    },
                  }}
                  data={currentWeekData.revenueData}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
