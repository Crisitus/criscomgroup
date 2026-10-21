"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card"
import { cn } from "../../lib/utils"

interface DecoratedCardProps {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
  footer?: React.ReactNode
  delay?: number
}

export function DecoratedCard({ children, className, title, description, footer, delay = 0 }: DecoratedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn("relative", className)}
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-70 blur-[2px] -z-10 transform scale-[0.98] dark:opacity-50" />
      <Card className="backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 border-0 shadow-xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}

        <CardContent>{children}</CardContent>

        {footer && <CardFooter>{footer}</CardFooter>}
      </Card>
    </motion.div>
  )
}

