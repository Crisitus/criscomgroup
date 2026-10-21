"use client"

import { Chart as ChartJS, ArcElement, Tooltip, Legend, type ChartOptions } from "chart.js"
import { Pie } from "react-chartjs-2"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { motion } from "framer-motion"

// Registrar los componentes de Chart.js
ChartJS.register(ArcElement, Tooltip, Legend)

// Actualizar la interfaz PieChartProps para incluir animationDelay:
interface PieChartProps {
  title: string
  description?: string
  data: {
    labels: string[]
    datasets: {
      label: string
      data: number[]
      backgroundColor: string[]
      borderColor?: string[]
      borderWidth?: number
      hoverOffset?: number
    }[]
  }
  height?: number
  className?: string
  animationDelay?: number
}

// Actualizar la función PieChart para incluir animaciones:
export function PieChart({
  title,
  description,
  data,
  height = 300,
  className = "",
  animationDelay = 0.4,
}: PieChartProps) {
  const options: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          color: "#4b5563",
          font: {
            size: 12,
          },
          padding: 20,
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
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1800,
      easing: "easeOutCirc",
    },
    layout: {
      padding: 10,
    },
    elements: {
      arc: {
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    },
  }

  // Asegurarse de que los datasets tengan hoverOffset
  if (data && data.datasets) {
    data.datasets.forEach((dataset) => {
      dataset.hoverOffset = 15
    })
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
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-pink-500 to-rose-600"></div>
        <CardHeader className="pb-2">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div style={{ height: `${height}px` }} className="flex items-center justify-center p-2">
            <Pie options={options} data={data} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
