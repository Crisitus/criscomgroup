import { motion } from "framer-motion"

interface ShimmerSkeletonProps {
  className?: string;
  [key: string]: unknown;
}

/**
 * Skeleton loader con efecto shimmer profesional
 * Usado para estados de carga elegantes tipo Apple/LinkedIn
 *
 * Características:
 * - Efecto shimmer continuo (gradiente animado)
 * - Respeta dark mode
 * - Clases de Tailwind personalizables
 * - Animación suave linear
 *
 * @example
 * // Loading de una card
 * <ShimmerSkeleton className="h-48 w-full rounded-2xl" />
 *
 * // Loading de texto
 * <ShimmerSkeleton className="h-4 w-3/4 rounded mb-2" />
 */
export const ShimmerSkeleton = ({ className = "", ...props }: ShimmerSkeletonProps) => {
  return (
    <motion.div
      className={`relative overflow-hidden bg-gray-200 dark:bg-gray-700 rounded ${className}`}
      animate={{
        backgroundPosition: ["200% 0", "-200% 0"]
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "linear"
      }}
      style={{
        background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)",
        backgroundSize: "200% 100%",
        backgroundColor: "currentColor"
      }}
      {...props}
    />
  )
}
