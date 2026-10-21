"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

export function BackgroundDecorations() {
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; size: number; color: string; shadow: string }>
  >([])

  useEffect(() => {
    // Crear partículas aleatorias
    const newParticles = Array.from({ length: 20 }).map((_, i) => {
      const r = Math.floor(Math.random() * 255)
      const g = Math.floor(Math.random() * 255)
      const b = Math.floor(Math.random() * 255)

      return {
        id: i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 6 + 2,
        color: `rgba(${r}, ${g}, ${b}, 0.3)`,
        shadow: `0 0 ${Math.random() * 10 + 5}px rgba(${r}, ${g}, ${b}, 0.5)`,
      }
    })

    setParticles(newParticles)
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Círculos decorativos */}
      <div className="absolute top-[10%] left-[15%] w-64 h-64 rounded-full bg-gradient-to-r from-pink-200 to-purple-300 dark:from-pink-700/30 dark:to-purple-800/30 blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-[40%] right-[15%] w-72 h-72 rounded-full bg-gradient-to-l from-blue-200 to-cyan-300 dark:from-blue-700/30 dark:to-cyan-800/30 blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[15%] left-[35%] w-80 h-80 rounded-full bg-gradient-to-tr from-yellow-200 to-orange-300 dark:from-yellow-700/30 dark:to-orange-800/30 blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      {/* Partículas flotantes */}
      <div className="particles-container">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="particle"
            initial={{
              x: particle.x,
              y: particle.y,
              opacity: Math.random() * 0.5 + 0.3,
            }}
            animate={{
              x: [particle.x, Math.random() * window.innerWidth, Math.random() * window.innerWidth],
              y: [particle.y, Math.random() * window.innerHeight, Math.random() * window.innerHeight],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: Math.random() * 20 + 20,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
              boxShadow: particle.shadow,
            }}
          />
        ))}
      </div>

      {/* Líneas de conexión */}
      <svg className="absolute inset-0 w-full h-full z-0 opacity-20 dark:opacity-10">
        <pattern id="grid-pattern" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
      </svg>
    </div>
  )
}

