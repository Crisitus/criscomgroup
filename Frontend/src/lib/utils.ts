import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)

  // Format date
  const formattedDate = date.toLocaleDateString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  // Format time
  const formattedTime = date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return `${formattedDate} ${formattedTime}`
}

// Helper function to convert date to YYYY-MM-DD format in local timezone
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Helper function to get today's date in YYYY-MM-DD format
export function getTodayDateString(): string {
  return formatDateForInput(new Date())
}

