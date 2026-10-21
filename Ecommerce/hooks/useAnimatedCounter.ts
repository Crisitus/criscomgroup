"use client"

import { useMotionValue, useTransform, animate, MotionValue } from "framer-motion"
import { useEffect } from "react"

/**
 * Hook personalizado para animar números (counters)
 * Útil para stats, precios, contadores, etc.
 *
 * @param value - Valor final del contador
 * @param duration - Duración de la animación en segundos
 * @returns MotionValue con el número animado (usar con motion.span)
 *
 * @example
 * const AnimatedCounter = ({ value }) => {
 *   const count = useAnimatedCounter(value, 2)
 *   return <motion.span>{count}</motion.span>
 * }
 */
export const useAnimatedCounter = (value: number, duration: number = 2): MotionValue<number> => {
  const count = useMotionValue(0)
  const rounded = useTransform(count, Math.round)

  useEffect(() => {
    const animation = animate(count, value, { duration })
    return animation.stop
  }, [value, count, duration])

  return rounded
}
