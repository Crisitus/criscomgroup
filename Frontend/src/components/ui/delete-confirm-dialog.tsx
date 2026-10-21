"use client"

import { AlertTriangle, Trash2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "./button"

interface DeleteConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
}

export function DeleteConfirmDialog({ open, onClose, onConfirm, title, description }: DeleteConfirmDialogProps) {
  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop overlay with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm dark:bg-black/50"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative bg-white dark:bg-gray-800 mx-auto max-w-md w-full rounded-xl shadow-lg overflow-hidden"
          >
            {/* Top gradient line */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 dark:from-pink-600 dark:via-purple-600 dark:to-indigo-600" />

            {/* Warning icon with pulsing animation */}
            <div className="p-6">
              <motion.div
                className="mb-5 w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mx-auto"
                animate={{
                  boxShadow: ["0 0 0 0 rgba(239, 68, 68, 0.2)", "0 0 0 10px rgba(239, 68, 68, 0)"],
                }}
                transition={{
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 2,
                }}
              >
                <AlertTriangle className="h-8 w-8 text-red-500 dark:text-red-400" />
              </motion.div>

              {/* El título ahora es completamente negro en modo claro */}
              <h2 className="text-xl font-semibold text-center mb-2 !text-black dark:!text-gray-100">{title}</h2>

              {/* La descripción ahora es gris muy oscuro en modo claro */}
              <p className="text-center !text-gray-800 dark:!text-gray-300">{description}</p>

              <div className="flex items-center justify-center space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="min-w-[120px] border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-gray-800 dark:text-gray-200"
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={onConfirm}
                  className="min-w-[120px] bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 dark:from-rose-600 dark:to-pink-700 dark:hover:from-rose-700 dark:hover:to-pink-800 border-0 shadow-md hover:shadow-lg transition-all duration-200 text-white"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
