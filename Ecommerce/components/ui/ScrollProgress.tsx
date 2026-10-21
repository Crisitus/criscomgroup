import { motion, useScroll } from "framer-motion"

/**
 * Barra de progreso de scroll global
 * Se muestra en la parte superior de la página indicando el progreso de scroll
 *
 * Características:
 * - Fixed position en top
 * - Gradiente corporativo de Criscom Group
 * - z-index alto para estar sobre todo
 * - Animación suave con scaleX
 *
 * @example
 * // En App.tsx o layout principal
 * <ScrollProgress />
 */
export const ScrollProgress = () => {
  const { scrollYProgress } = useScroll()

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-fv-gold z-[9999] origin-left"
      style={{ scaleX: scrollYProgress }}
    />
  )
}
