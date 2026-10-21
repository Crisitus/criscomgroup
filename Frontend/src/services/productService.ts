import api from "../lib/api"

// Actualizar la interfaz Product para incluir los nuevos campos
export interface Product {
  id_producto: number
  sku: string
  nombre: string
  descripcion: string | null
  precio_unitario: string
  precio_unitario_con_igv: string
  precio_mayoritario: string | null
  precio_mayoritario_con_igv: string | null
  precio_oferta?: string | null
  precio_oferta_con_igv?: string | null
  es_oferta: boolean
  stock: number
  condicion: "nuevo" | "segunda_mano"
  origen: "local" | "importado"
  garantia_meses: number
  estado_observaciones: string | null
  id_categoria: number
  imagen_url: string | null
  creado_en: string
  actualizado_en: string
  categoria?: {
    nombre: string
  }
  oferta?: {
    descuento: number
  }
  // Lotes de codigos de barras que trae el listado (orden de alta). Sin `fecha_ingreso`.
  codigos_barras?: Array<{ codigo_barras: string; cantidad: number }>
  // Solo llegan a Gerente/Administrador/Auditor o con permiso de inventario/compras.
  costo_promedio?: string | null
  ultimo_costo?: string | null
}

// Actualizar la interfaz ProductFormData para incluir los nuevos campos
export interface ProductFormData {
  sku: string
  nombre: string
  descripcion?: string
  precio_unitario: number
  precio_unitario_con_igv?: number
  precio_mayoritario?: number | null
  precio_mayoritario_con_igv?: number | null
  stock?: number
  condicion?: "nuevo" | "segunda_mano"
  origen?: "local" | "importado"
  garantia_meses?: number
  estado_observaciones?: string
  id_categoria: number
  imagen?: File
}

// Modificar la función fetchProducts para manejar silenciosamente los errores 403
export const fetchProducts = async (): Promise<Product[]> => {
  try {
    const response = await api.get(`/productos`)
    return response.data
  } catch (error: any) {
    throw error
  }
}

// Modificar la función fetchProductById para manejar silenciosamente los errores 403
export const fetchProductById = async (id: number | string): Promise<Product> => {
  try {
    // Validar que el ID sea un número válido
    if (id === undefined || id === null || (typeof id === "string" && id.trim() === "") || isNaN(Number(id))) {
      throw new Error("ID de producto no válido")
    }

    const response = await api.get(`/productos/${id}`)
    return response.data
  } catch (error: any) {
    throw error
  }
}

export const fetchProductsByCategory = async (categoryId: number): Promise<Product[]> => {
  // Validar que el ID de categoría sea un número válido
  if (categoryId === undefined || categoryId === null || isNaN(Number(categoryId))) {
    console.error("ID de categoría no válido")
    return []
  }

  const response = await api.get(`/productos/categoria/${categoryId}`)
  return response.data
}

export const createProduct = async (data: ProductFormData): Promise<Product> => {
  try {
    // Check if we need to send form data with image or regular JSON
    if (data.imagen) {
      const formData = new FormData()
      
      // Add all form fields to FormData without additional price processing
      // The prices are already processed in the frontend
      formData.append('sku', data.sku)
      formData.append('nombre', data.nombre)
      if (data.descripcion) formData.append('descripcion', data.descripcion)
      formData.append('precio_unitario', data.precio_unitario.toString())
      if (data.precio_unitario_con_igv !== undefined) {
        formData.append('precio_unitario_con_igv', data.precio_unitario_con_igv.toString())
      }
      if (data.precio_mayoritario !== null && data.precio_mayoritario !== undefined) {
        formData.append('precio_mayoritario', data.precio_mayoritario.toString())
      }
      if (data.precio_mayoritario_con_igv !== null && data.precio_mayoritario_con_igv !== undefined) {
        formData.append('precio_mayoritario_con_igv', data.precio_mayoritario_con_igv.toString())
      }
      formData.append('stock', String(data.stock ?? 0))
      formData.append('condicion', data.condicion || 'nuevo')
      formData.append('origen', data.origen || 'local')
      formData.append('garantia_meses', String(data.garantia_meses ?? (data.condicion === 'segunda_mano' ? 3 : 12)))
      if (data.estado_observaciones) formData.append('estado_observaciones', data.estado_observaciones)
      formData.append('id_categoria', data.id_categoria.toString())
      formData.append('imagen', data.imagen)
      
      const response = await api.post(`/productos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data.producto
    } else {
      // Send regular JSON request
      const jsonData = { ...data, imagen: undefined }
      const response = await api.post(`/productos`, jsonData)
      return response.data.producto
    }
  } catch (error: any) {
    // Mejorar el manejo de errores para proporcionar mensajes más específicos
    if (error.response && error.response.status === 409) {
      if (error.response.data.message.includes("SKU")) {
        throw new Error("Ya existe un producto con ese SKU. Por favor, utiliza un SKU diferente.")
      } else {
        throw new Error(error.response.data.message || "Conflicto al crear el producto")
      }
    }
    throw error
  }
}

export const updateProduct = async (id: number, data: ProductFormData): Promise<Product> => {
  // Validar que el ID sea un número válido
  if (id === undefined || id === null || isNaN(Number(id))) {
    throw new Error("ID de producto no válido")
  }
  // Check if we need to send form data with image or regular JSON
  if (data.imagen) {
    const formData = new FormData()
    
    // Add all form fields to FormData without additional price processing
    // The prices are already processed in the frontend
    formData.append('sku', data.sku)
    formData.append('nombre', data.nombre)
    if (data.descripcion) formData.append('descripcion', data.descripcion)
    formData.append('precio_unitario', data.precio_unitario.toString())
    if (data.precio_unitario_con_igv !== undefined) {
      formData.append('precio_unitario_con_igv', data.precio_unitario_con_igv.toString())
    }
    if (data.precio_mayoritario !== null && data.precio_mayoritario !== undefined) {
      formData.append('precio_mayoritario', data.precio_mayoritario.toString())
    }
    if (data.precio_mayoritario_con_igv !== null && data.precio_mayoritario_con_igv !== undefined) {
      formData.append('precio_mayoritario_con_igv', data.precio_mayoritario_con_igv.toString())
    }
    // Solo se envia lo que el formulario trae: omitir un campo conserva el valor guardado
    if (data.stock !== undefined) formData.append('stock', data.stock.toString())
    if (data.condicion) formData.append('condicion', data.condicion)
    if (data.origen) formData.append('origen', data.origen)
    if (data.garantia_meses !== undefined && data.garantia_meses !== null) formData.append('garantia_meses', String(data.garantia_meses))
    if (data.estado_observaciones !== undefined) formData.append('estado_observaciones', data.estado_observaciones || '')
    formData.append('id_categoria', data.id_categoria.toString())
    formData.append('imagen', data.imagen)
    
    const response = await api.put(`/productos/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data.producto
  } else {
    // Send regular JSON request
    const jsonData = { ...data, imagen: undefined }
    const response = await api.put(`/productos/${id}`, jsonData)
    return response.data.producto
  }
}

export const updateProductStock = async (id: number, cantidad: number): Promise<Product> => {
  // Validar que el ID sea un número válido
  if (id === undefined || id === null || isNaN(Number(id))) {
    throw new Error("ID de producto no válido")
  }

  const response = await api.patch(`/productos/${id}/stock`, { cantidad })
  return response.data.producto
}

export const decrementProductStock = async (id: number, cantidad: number): Promise<Product> => {
  // Validar que el ID sea un número válido
  if (id === undefined || id === null || isNaN(Number(id))) {
    throw new Error("ID de producto no válido")
  }

  const response = await api.patch(`/productos/${id}/decrement`, { cantidad })
  return response.data.producto
}

// Modificar la función deleteProduct para manejar silenciosamente los errores 403
export const deleteProduct = async (id: number): Promise<void> => {
  try {
    // Validar que el ID sea un número válido
    if (id === undefined || id === null || isNaN(Number(id))) {
      throw new Error("ID de producto no válido")
    }

    await api.delete(`/productos/${id}`)
  } catch (error: any) {
    // Si es un error 403, manejamos silenciosamente
    if (error.response?.status === 403) {
      throw new Error("No tienes permiso para realizar esta acción en este momento")
    }
    // Para otros errores, los propagamos normalmente
    throw error
  }
}

export const deleteProductImage = async (id: number): Promise<void> => {
  try {
    // Validar que el ID sea un número válido
    if (id === undefined || id === null || isNaN(Number(id))) {
      throw new Error("ID de producto no válido")
    }

    await api.delete(`/productos/${id}/imagen`)
  } catch (error: any) {
    // Si es un error 403, manejamos silenciosamente
    if (error.response?.status === 403) {
      throw new Error("No tienes permiso para realizar esta acción en este momento")
    }
    // Para otros errores, los propagamos normalmente
    throw error
  }
}
