"use client"

import { useScroll, useTransform, MotionValue } from "framer-motion"
import { useRef } from "react"

/**
 * Hook personalizado para crear efectos parallax
 * El elemento se mueve a diferente velocidad que el scroll
 *
 * @param distance - Distancia del movimiento parallax en px
 * @returns ref para el elemento y valor y para motion style
 *
 * @example
 * const { ref, y } = useParallax(150)
 *
 * <motion.div ref={ref}>
 *   <motion.img style={{ y }} />
 * </motion.div>
 */
export const useParallax = (distance: number = 100): { ref: React.RefObject<HTMLDivElement>, y: MotionValue<number> } => {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  })
  const y = useTransform(scrollYProgress, [0, 1], [-distance, distance])

  return { ref: ref as React.RefObject<HTMLDivElement>, y }
}
