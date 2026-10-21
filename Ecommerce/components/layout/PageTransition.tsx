import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import { ReactNode, useLayoutEffect } from "react"

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Wrapper para transiciones entre páginas
 * Aplica animaciones suaves al cambiar de ruta
 *
 * Características:
 * - Fade + slide sutil en entrada/salida
 * - AnimatePresence para transiciones suaves
 * - Detecta cambios de ruta automáticamente
 * - Easing curve tipo Apple
 * - Respeta prefers-reduced-motion
 *
 * @example
 * // En App.tsx o router principal
 * <PageTransition>
 *   <Routes>
 *     <Route path="/" element={<Home />} />
 *   </Routes>
 * </PageTransition>
 */
export const PageTransition = ({ children }: PageTransitionProps) => {
  const pathname = usePathname()

  useLayoutEffect(() => {
    // Las transiciones mantienen montado el contenedor anterior durante un
    // instante. Restablecer el scroll aquí evita que la nueva ruta aparezca
    // a la misma altura que la página desde la que se navegó.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  }, [pathname])

  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 0.15,
          ease: [0.22, 1, 0.36, 1]
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
