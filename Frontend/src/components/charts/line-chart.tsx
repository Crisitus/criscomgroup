"use client"

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from "chart.js"
import { Line } from "react-chartjs-2"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { motion } from "framer-motion"

// Registrar los componentes de Chart.js y añadir animaciones
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

// Actualizar la interfaz LineChartProps para incluir animationDelay:
interface LineChartProps {
  title: string
  description?: string
  data: {
    labels: string[]
    datasets: {
      label: string
      data: number[]
      borderColor: string
      backgroundColor: string
      fill?: boolean
      tension?: number
      pointBackgroundColor?: string
      pointBorderColor?: string
      pointRadius?: number
      pointHoverRadius?: number
    }[]
  }
  height?: number
  className?: string
  animationDelay?: number
}

// Actualizar la función LineChart para incluir animaciones:
export function LineChart({
  title,
  description,
  data,
  height = 300,
  className = "",
  animationDelay = 0.2,
}: LineChartProps) {
  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#4b5563",
          font: {
            size: 12,
          },
          padding: 16,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        titleColor: "#111827",
        bodyColor: "#4b5563",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        boxPadding: 4,
        titleFont: {
          size: 14,
          weight: "bold",
        },
        bodyFont: {
          size: 13,
        },
        displayColors: true,
        caretSize: 6,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          color: "#e5e7eb",
        },
        ticks: {
          color: "#6b7280",
          font: {
            size: 11,
          },
        },
        border: {
          color: "#e5e7eb",
        },
      },
      y: {
        grid: {
          color: "rgba(229, 231, 235, 0.7)",
          tickBorderDash: [2, 4],
        },
        ticks: {
          color: "#6b7280",
          font: {
            size: 11,
          },
          padding: 8,
          callback: (value) => {
            if (typeof value === "number") {
              return "S/ " + value.toLocaleString("es-PE")
            }
            return value
          },
        },
        border: {
          color: "#e5e7eb",
        },
        beginAtZero: true,
      },
    },
    animation: {
      duration: 2000,
      easing: "easeOutQuart",
    },
    elements: {
      line: {
        tension: 0.4,
      },
      point: {
        radius: 4,
        hitRadius: 10,
        hoverRadius: 6,
        hoverBorderWidth: 2,
      },
    },
    layout: {
      padding: {
        top: 5,
        bottom: 5,
      },
    },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: animationDelay }}
    >
      <Card
        className={`border-0 shadow-lg overflow-hidden ${className} hover:shadow-xl transition-shadow duration-300`}
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-violet-600"></div>
        <CardHeader className="pb-2">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div style={{ height: `${height}px` }} className="p-2">
            <Line options={options} data={data} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
