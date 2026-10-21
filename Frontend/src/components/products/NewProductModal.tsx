"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { X, Plus, Barcode, Upload, Shuffle, AlertTriangle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import type { CodigoBarrasItem } from "../../services/codigoBarrasService"
import { generarCodigoBarrasAleatorio } from "../../services/codigoBarrasService"
import { generarSkuAleatorio } from "../../services/skuService"

const productSchema = z.object({
  sku: z.string().min(1, "El SKU es requerido"),
  nombre: z.string().min(1, "El nombre es requerido"),
  descripcion: z.string().optional(),
  condicion: z.enum(["nuevo", "segunda_mano"]),
  origen: z.enum(["local", "importado"]),
  garantia_meses: z.coerce.number().int().min(0).max(120),
  estado_observaciones: z.string().optional(),
  precio_unitario: z.coerce.number().min(0, "El precio debe ser mayor o igual a 0"),
  precio_mayoritario: z.coerce.number().min(0, "El precio mayorista debe ser mayor o igual a 0").optional().nullable(),
  id_categoria: z.coerce.number().min(1, "La categoría es requerida"),
  imagen: z.instanceof(File).optional(),
})

type ProductFormValues = z.infer<typeof productSchema>

interface Category {
  id_categoria: number
  nombre: string
}

interface NewProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (values: ProductFormValues, barcodes: CodigoBarrasItem[], image: File | null) => Promise<void>
  categories: Category[] | undefined
  isSubmitting: boolean
}

export function NewProductModal({ isOpen, onClose, onSubmit, categories, isSubmitting }: NewProductModalProps) {
  // Estados para códigos de barras
  const [barcodes, setBarcodes] = useState<CodigoBarrasItem[]>([])
  const [newBarcode, setNewBarcode] = useState("")
  const [newBarcodeQuantity, setNewBarcodeQuantity] = useState(1)
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  // Estados para el escáner (siempre activo)
  const [isGeneratingBarcode, setIsGeneratingBarcode] = useState(false)
  const [isGeneratingSku, setIsGeneratingSku] = useState(false)

  // Estados para imagen
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: "",
      nombre: "",
      descripcion: "",
      condicion: "nuevo",
      origen: "local",
      garantia_meses: 12,
      estado_observaciones: "",
      precio_unitario: 0,
      precio_mayoritario: 0,
      id_categoria: 0,
    },
  })

  // Efecto para enfocar automáticamente el input del nombre del producto cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      // Pequeño delay para asegurar que el modal esté completamente renderizado
      const timer = setTimeout(() => {
        // Buscar el campo del nombre del producto y enfocarlo
        const nombreInput = document.querySelector('input[placeholder="Nombre descriptivo del producto"]') as HTMLInputElement
        if (nombreInput) {
          nombreInput.focus()
        }
      }, 200)

      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Función para limpiar el formulario y estados
  const resetForm = () => {
    form.reset()
    setBarcodes([])
    setNewBarcode("")
    setNewBarcodeQuantity(1)
    setIsGeneratingBarcode(false)
    setIsGeneratingSku(false)
    clearImage()
  }

  // Estado para mostrar el modal de confirmación personalizado
  const [showNoBarcodeDialog, setShowNoBarcodeDialog] = useState(false)
  const [pendingSubmitValues, setPendingSubmitValues] = useState<ProductFormValues | null>(null)

  // Función para manejar el envío del formulario
  const handleSubmit = async (values: ProductFormValues) => {
    // Calcular el stock total basado en los códigos de barras
    const totalStock = barcodes.reduce((total, barcode) => total + barcode.cantidad, 0)

    if (barcodes.length === 0 || totalStock === 0) {
      setPendingSubmitValues(values)
      setShowNoBarcodeDialog(true)
      return
    }
    await onSubmit(values, barcodes, selectedImage)
    resetForm()
  }

  // Función para confirmar el guardado sin códigos de barra
  const confirmSaveWithoutBarcodes = async () => {
    if (pendingSubmitValues) {
      await onSubmit(pendingSubmitValues, barcodes, selectedImage)
      resetForm()
      setShowNoBarcodeDialog(false)
      setPendingSubmitValues(null)
    }
  }

  // Función para cancelar el guardado sin códigos de barra
  const cancelSaveWithoutBarcodes = () => {
    setShowNoBarcodeDialog(false)
    setPendingSubmitValues(null)
  }

  // Función para manejar el cierre del modal
  const handleClose = () => {
    resetForm()
    onClose()
  }
  // Función para generar código de barras aleatorio
  const generateRandomBarcode = async () => {
    setIsGeneratingBarcode(true)
    try {
      const codigo = await generarCodigoBarrasAleatorio()
      // Limitar el código a máximo 10 caracteres
      const codigoLimitado = codigo.substring(0, 10)
      setNewBarcode(codigoLimitado)
      // Enfocar el input después de generar el código
      setTimeout(() => {
        barcodeInputRef.current?.focus()
      }, 100)
    } catch (error) {
      console.error("Error al generar código de barras:", error)
      alert("Error al generar código de barras único. Intenta de nuevo.")
    } finally {
      setIsGeneratingBarcode(false)
    }
  }

  // Funciones para manejar códigos de barras
  const addBarcode = () => {
    if (newBarcode.trim() && newBarcodeQuantity > 0) {
      // Verificar si el código ya existe
      const existingIndex = barcodes.findIndex((item) => item.codigo === newBarcode.trim())

      if (existingIndex !== -1) {
        // Si existe, actualizar la cantidad
        const updatedBarcodes = [...barcodes]
        updatedBarcodes[existingIndex].cantidad += newBarcodeQuantity
        setBarcodes(updatedBarcodes)
      } else {
        // Si no existe, agregar nuevo código
        setBarcodes([
          ...barcodes,
          {
            codigo: newBarcode.trim(),
            cantidad: newBarcodeQuantity,
          },
        ])
      }

      setNewBarcode("")
      setNewBarcodeQuantity(1)
      barcodeInputRef.current?.focus()
    }
  }

  const removeBarcode = (index: number) => {
    setBarcodes(barcodes.filter((_, i) => i !== index))
  }

  const handleBarcodeKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addBarcode()
    }
  }

  // Funciones para manejar imagen
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tamaño (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        alert("El archivo es demasiado grande. Máximo 5MB.")
        return
      }

      // Validar tipo
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
      if (!allowedTypes.includes(file.type)) {
        alert("Tipo de archivo no válido. Solo se permiten JPG, PNG y WebP.")
        return
      }

      setSelectedImage(file)
      form.setValue("imagen", file)

      // Crear preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const clearImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    form.setValue("imagen", undefined)

    // Limpiar el input de archivo
    const fileInput = document.getElementById("imagen-upload") as HTMLInputElement
    if (fileInput) {
      fileInput.value = ""
    }
  }

  // Función para generar SKU manualmente cuando se hace clic en el botón
  const generateSkuManually = async () => {
    const currentCategoryId = form.getValues('id_categoria')
    
    if (!currentCategoryId) {
      alert("Por favor selecciona una categoría primero")
      return
    }

    setIsGeneratingSku(true)
    try {
      const generatedSku = await generarSkuAleatorio(currentCategoryId)
      form.setValue("sku", generatedSku)
    } catch (error) {
      console.error("Error al generar SKU:", error)
      alert("Error al generar SKU. Intenta de nuevo.")
    } finally {
      setIsGeneratingSku(false)
    }
  }

  // Función para manejar el cambio de categoría (sin generar SKU automáticamente)
  const handleCategoryChange = (categoryId: number) => {
    form.setValue("id_categoria", categoryId)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {/* Modal personalizado para confirmar guardar sin códigos de barra */}
      <AlertDialog open={showNoBarcodeDialog} onOpenChange={setShowNoBarcodeDialog}>
        <AlertDialogContent className="bg-card/95 backdrop-blur-sm border border-border/50 shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
              <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <AlertDialogTitle className="text-xl font-semibold text-center text-gray-900 dark:text-gray-100">
              Guardar sin códigos de barra
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-gray-600 dark:text-gray-400">
              No has agregado ningún código de barras o el stock es 0.
              <br />
              ¿Estás seguro de que deseas guardar el producto sin códigos de barra?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex justify-center space-x-3 mt-6">
            <AlertDialogCancel
              onClick={cancelSaveWithoutBarcodes}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSaveWithoutBarcodes}
              className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Guardar de todas formas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden bg-card border border-border shadow-xl">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-white -mt-6 -mx-6 mb-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Nuevo Producto</DialogTitle>
            <DialogDescription className="text-white/90">
              Completa la información para crear un nuevo producto
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[calc(90vh-160px)] overflow-y-auto px-6 pb-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* SKU y Categoría */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">SKU</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Código único del producto"
                            {...field}
                            className="bg-background border-border focus:ring-2 focus:ring-indigo-500/20"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={generateSkuManually}
                            disabled={isGeneratingSku}
                            className="px-3 border-border hover:bg-accent"
                            title="Generar SKU aleatorio"
                          >
                            {isGeneratingSku ? (
                              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                            ) : (
                              <Shuffle className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="id_categoria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Categoría</FormLabel>
                      <Select
                        onValueChange={(value) => handleCategoryChange(Number.parseInt(value))}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background border-border focus:ring-2 focus:ring-indigo-500/20">
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category.id_categoria} value={category.id_categoria.toString()}>
                              {category.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Nombre */}
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground">Nombre del Producto</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nombre descriptivo del producto"
                        {...field}
                        className="bg-background border-border focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Descripción */}
              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-foreground">Descripción</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Descripción adicional (opcional)"
                        {...field}
                        className="bg-background border-border focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField control={form.control} name="condicion" render={({ field }) => (
                  <FormItem><FormLabel>Condición</FormLabel><Select value={field.value} onValueChange={(value) => { field.onChange(value); form.setValue('garantia_meses', value === 'segunda_mano' ? 3 : 12) }}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="nuevo">Nuevo</SelectItem><SelectItem value="segunda_mano">Segunda mano</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="origen" render={({ field }) => (
                  <FormItem><FormLabel>Origen</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="local">Compra local</SelectItem><SelectItem value="importado">Importado</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="garantia_meses" render={({ field }) => (
                  <FormItem><FormLabel>Garantía comercial (meses)</FormLabel><FormControl><Input type="number" min="0" max="120" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="estado_observaciones" render={({ field }) => (
                <FormItem><FormLabel>Estado, desgaste o reparaciones conocidas</FormLabel><FormControl><Input placeholder="Obligatorio informar detalles relevantes en equipos usados" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              {/* Precios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="precio_unitario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Precio Unitario</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          className="bg-background border-border focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="precio_mayoritario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Precio Mayorista</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00 (opcional)"
                          {...field}
                          value={field.value ?? ""}
                          className="bg-background border-border focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* Imagen del producto */}
              <div className="space-y-4">
                <FormLabel className="text-sm font-semibold text-foreground">Imagen del Producto</FormLabel>
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="imagen-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {imagePreview ? (
                        <div className="relative">
                          <img
                            src={imagePreview || "/placeholder.svg"}
                            alt="Preview"
                            className="h-20 w-20 object-cover rounded-lg shadow-md"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              clearImage()
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-lg"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                          <p className="mb-2 text-sm text-muted-foreground">
                            <span className="font-semibold">Click para subir</span> o arrastra y suelta
                          </p>
                          <p className="text-xs text-muted-foreground">PNG, JPG o WebP (MAX. 5MB)</p>
                        </>
                      )}
                    </div>
                    <input
                      id="imagen-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              </div>{" "}
              {/* Códigos de barras */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-semibold text-foreground">Códigos de Barras</FormLabel>

                  {/* Indicador de escáner siempre activo */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium"
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Escáner activo
                  </motion.div>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      ref={barcodeInputRef}
                      type="text"
                      placeholder="Escanear o escribir código de barras"
                      value={newBarcode}
                      onChange={(e) => setNewBarcode(e.target.value)}
                      onKeyPress={handleBarcodeKeyPress}
                      className="bg-background border-border focus:ring-2 focus:ring-green-500/20 ring-1 ring-green-500/30 border-green-500/50"
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Cant."
                      value={newBarcodeQuantity}
                      onChange={(e) => setNewBarcodeQuantity(Number.parseInt(e.target.value) || 1)}
                      className="bg-background border-border focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={addBarcode}
                    disabled={!newBarcode.trim() || newBarcodeQuantity <= 0}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Botón para generar código aleatorio - solo se muestra si no hay códigos */}
                <AnimatePresence>
                  {barcodes.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex justify-center"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateRandomBarcode}
                        disabled={isGeneratingBarcode}
                        className="border-dashed border-2 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 bg-transparent"
                      >
                        {isGeneratingBarcode ? (
                          <>
                            <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mr-2" />
                            Generando...
                          </>
                        ) : (
                          <>
                            <Shuffle className="h-4 w-4 mr-2" />
                            Generar código aleatorio
                          </>
                        )}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Lista de códigos de barras */}
                <AnimatePresence>
                  {barcodes.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 max-h-32 overflow-y-auto"
                    >
                      {barcodes.map((item, index) => (
                        <motion.div
                          key={`${item.codigo}-${index}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
                        >
                          <div className="flex items-center gap-3">
                            <Barcode className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{item.codigo}</span>
                            <Badge variant="secondary" className="text-xs">
                              {item.cantidad} unidades
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBarcode(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* Botones */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="border-border bg-transparent"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Producto
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
