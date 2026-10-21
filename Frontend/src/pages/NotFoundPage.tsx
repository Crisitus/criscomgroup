"use client"

import { Link } from "react-router-dom"
import { Button } from "../components/ui/button"
import { ArrowLeft, Home } from "lucide-react"
import { motion } from "framer-motion"

// Importar el hook de título del documento al comienzo del archivo
import { useDocumentTitle } from "../hooks/useDocumentTitle"

const NotFoundPage = () => {
  // Añadir el hook para cambiar el título del documento
  useDocumentTitle("Página no encontrada")
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div
        className="max-w-md w-full space-y-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Contenedor principal */}
        <div className="bg-card/50 border-border/20 backdrop-blur-sm rounded-xl p-8 space-y-6">
          <motion.div
            className="space-y-4"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h1 className="text-8xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 dark:from-purple-400 dark:via-pink-400 dark:to-blue-400 bg-clip-text text-transparent">
              404
            </h1>
            <h2 className="text-2xl font-semibold text-foreground">
              Página no encontrada
            </h2>
            <p className="text-foreground/70">
              Lo sentimos, la página que estás buscando no existe o ha sido movida.
            </p>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row gap-3 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <Button asChild variant="outline" className="bg-background/50 border-border/20">
              <Link to="/" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver atrás
              </Link>
            </Button>
            <Button
              asChild
              className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 text-white border-0"
            >
              <Link to="/" className="flex items-center">
                <Home className="mr-2 h-4 w-4" />
                Ir al inicio
              </Link>
            </Button>
          </motion.div>
        </div>

        {/* Elemento decorativo opcional */}
        <motion.div
          className="flex justify-center opacity-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 1, delay: 1 }}
        >
          <div className="w-32 h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 dark:from-purple-400 dark:via-pink-400 dark:to-blue-400 rounded-full"></div>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default NotFoundPage

