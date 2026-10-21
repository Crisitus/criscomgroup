"use client"

import type React from "react"

// src/components/keyboard-shortcuts-modal.tsx
import { useState } from "react"
import { X, Keyboard, CheckCircle, XCircle } from "lucide-react"
import { useKeyboardShortcuts } from "../contexts/KeyboardShortcutsContext"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { motion } from "framer-motion"

export function KeyboardShortcutsModal() {
  const { shortcuts, updateShortcut, resetToDefaults, showShortcutModal, setShowShortcutModal } = useKeyboardShortcuts()

  const [editingShortcut, setEditingShortcut] = useState<string | null>(null)
  const [newKeys, setNewKeys] = useState("")
  const [recordingKeys, setRecordingKeys] = useState(false)

  const handleStartRecording = (id: string, currentKeys: string) => {
    setEditingShortcut(id)
    setNewKeys(currentKeys)
    setRecordingKeys(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!recordingKeys) return

    e.preventDefault()

    // Construir la combinación de teclas
    const keys = []
    if (e.altKey) keys.push("alt")
    if (e.ctrlKey) keys.push("ctrl")
    if (e.shiftKey) keys.push("shift")
    if (e.metaKey) keys.push("meta")

    // Solo agregar la tecla principal si no es una tecla modificadora
    if (!["Alt", "Control", "Shift", "Meta"].includes(e.key)) {
      keys.push(e.key.toLowerCase())
    }

    if (keys.length > 0) {
      setNewKeys(keys.join("+"))
    }

    // Si se presiona Escape, cancelar la grabación
    if (e.key === "Escape") {
      setRecordingKeys(false)
      setEditingShortcut(null)
    }
  }

  const handleSaveShortcut = () => {
    if (editingShortcut && newKeys) {
      updateShortcut(editingShortcut, {
        ...shortcuts[editingShortcut],
        keys: newKeys,
      })
    }
    setRecordingKeys(false)
    setEditingShortcut(null)
  }
  return (
    <Dialog open={showShortcutModal} onOpenChange={setShowShortcutModal}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden bg-card border border-border shadow-xl">
        {/* Top gradient line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        <DialogHeader className="pb-4 border-b border-border">
          <div className="flex items-center mb-2">
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center mr-3">
              <Keyboard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <DialogTitle className="text-2xl font-bold text-foreground">Atajos de Teclado</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground">
            Visualiza y personaliza los atajos de teclado para navegar rápidamente por la aplicación.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="view" className="py-2">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger
              value="view"
              className="data-[state=active]:bg-indigo-100 dark:data-[state=active]:bg-indigo-950 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-300"
            >
              Ver Atajos
            </TabsTrigger>
            <TabsTrigger
              value="edit"
              className="data-[state=active]:bg-indigo-100 dark:data-[state=active]:bg-indigo-950 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-300"
            >
              Personalizar
            </TabsTrigger>
          </TabsList>          <TabsContent value="view">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 max-h-[60vh] overflow-y-auto pr-2">
              {Object.entries(shortcuts).map(([id, { keys, description }], index) => (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="flex justify-between items-center p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <span className="text-foreground">{description}</span>
                  <kbd className="px-3 py-1.5 bg-muted text-muted-foreground rounded text-sm font-mono border border-border shadow-sm">
                    {keys}
                  </kbd>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="edit">
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 max-h-[60vh] overflow-y-auto pr-2"
              onKeyDown={handleKeyDown}
              tabIndex={-1}
            >
              {Object.entries(shortcuts).map(([id, { keys, description }], index) => (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className={`flex flex-col space-y-2 p-4 border border-border rounded-lg transition-colors ${
                    editingShortcut === id
                      ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/50"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <Label htmlFor={`shortcut-${id}`} className="font-medium text-foreground">
                      {description}
                    </Label>
                    {editingShortcut === id ? (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={handleSaveShortcut}
                          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0"
                        >
                          <CheckCircle className="mr-1 h-3.5 w-3.5" />
                          Guardar                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingShortcut(null)
                            setRecordingKeys(false)
                          }}
                          className="border-border"
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartRecording(id, keys)}
                        className="border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                      >
                        Editar
                      </Button>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Input
                      id={`shortcut-${id}`}
                      value={editingShortcut === id ? newKeys : keys}
                      readOnly
                      className={`font-mono ${
                        editingShortcut === id
                          ? "bg-yellow-50 dark:bg-yellow-950/50 border-yellow-300 dark:border-yellow-700"
                          : "bg-muted"
                      }`}
                      placeholder={editingShortcut === id ? "Presiona la combinación de teclas..." : ""}
                    />
                    {editingShortcut === id && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setNewKeys("")}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>                  {editingShortcut === id && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Presiona la combinación de teclas deseada y luego haz clic en Guardar
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between items-center border-t border-border pt-4">
          <Button
            variant="destructive"
            onClick={resetToDefaults}
            className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 border-0 text-white"
          >
            Restaurar valores predeterminados
          </Button>
          <Button
            variant="default"
            onClick={() => setShowShortcutModal(false)}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

