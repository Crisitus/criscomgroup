import api from "../lib/api"

export interface CodigoBarras {
  id_codigo_barras: number
  codigo_barras: string
  id_producto: number
  fecha_ingreso: string
}

export interface CodigosBarrasResponse {
  producto: {
    id_producto: number
    nombre: string
    sku: string
    stock: number
  }
  total_codigos: number
  codigos_barras: CodigoBarras[]
}

export interface CodigoBarrasItem {
  codigo: string
  cantidad: number
}

// Caché simple para evitar consultas repetidas
const codigoBarrasCache: Record<string, any> = {}

export const obtenerCodigosBarras = async (idProducto: number): Promise<any> => {
  try {
    const response = await api.get(`/codigos-barras/producto/${idProducto}`)
    return response.data
  } catch (error) {
    console.error("Error al obtener códigos de barras:", error)
    throw error
  }
}

export const agregarCodigosBarras = async (idProducto: number, codigosBarras: CodigoBarrasItem[]): Promise<any> => {
  try {
    const response = await api.post(`/codigos-barras/producto/${idProducto}`, {
      codigos_barras: codigosBarras,
    })
    return response.data
  } catch (error: any) {
    // Mejorar el manejo de errores para proporcionar mensajes más específicos
    if (error.response && error.response.status === 409) {
      const duplicados = error.response.data.codigos_duplicados || []
      if (duplicados.length > 0) {
        throw new Error(`Los siguientes códigos ya existen: ${duplicados.join(", ")}`)
      } else {
        throw new Error("Algunos códigos de barras ya existen en el sistema")
      }
    }
    throw error
  }
}

// Mejorar la función buscarProductoPorCodigoBarras para manejar la cantidad
export const buscarProductoPorCodigoBarras = async (codigo: string) => {
  // Verificar si el código ya está en caché
  if (codigoBarrasCache[codigo]) {
    return codigoBarrasCache[codigo]
  }

  try {
    const response = await api.get(`/codigos-barras/${codigo}/producto`)

    if (!response.data) {
      throw new Error("Código de barras no encontrado")
    }

    // Guardar en caché el resultado
    codigoBarrasCache[codigo] = response.data

    return response.data
  } catch (error: any) {
    // Mejorar el manejo de errores para ser más específico con los 404
    if (error.response && error.response.status === 404) {
      throw new Error(`Código de barras '${codigo}' no encontrado`)
    }

    console.error("Error al buscar producto por código de barras:", error)
    throw error
  }
}

// Función para obtener códigos de barras disponibles
export const obtenerCodigosBarrasDisponibles = async (idProducto: number): Promise<string[]> => {
  try {
    // Usar el endpoint existente que obtiene todos los códigos de barras de un producto
    const response = await api.get(`/codigos-barras/producto/${idProducto}`)

    // Extraer los códigos de barras de la respuesta
    if (response.data && response.data.codigos_barras) {
      return response.data.codigos_barras.map((item: any) => item.codigo)
    }

    return []
  } catch (error) {
    console.error("Error al obtener códigos de barras disponibles:", error)
    return []
  }
}

// Modificar la función actualizarCantidadCodigoBarras para que use el código de barras en lugar del ID
export const actualizarCantidadCodigoBarras = async (codigo: string, cantidad: number): Promise<any> => {
  try {
    const response = await api.put(`/codigos-barras/${codigo}/cantidad`, { cantidad })
    return response.data
  } catch (error) {
    console.error("Error al actualizar cantidad de código de barras:", error)
    throw error
  }
}

// Función para eliminar un código de barras por ID
export const eliminarCodigoBarras = async (id_codigo_barras: number): Promise<any> => {
  try {
    const response = await api.delete(`/codigos-barras/${id_codigo_barras}`)
    return response.data
  } catch (error) {
    console.error("Error al eliminar código de barras:", error)
    throw error
  }
}

// Función para eliminar un código de barras por código (mantenemos la función original por compatibilidad)
export const eliminarCodigoBarrasPorCodigo = async (codigo: string): Promise<any> => {
  try {
    const response = await api.delete(`/codigos-barras/codigo/${codigo}`)
    return response.data
  } catch (error) {
    console.error("Error al eliminar código de barras por código:", error)
    throw error
  }
}

// Función para verificar si un código de barras existe globalmente
export const verificarCodigoBarrasExiste = async (codigo: string): Promise<boolean> => {
  try {
    await api.get(`/codigos-barras/${codigo}/producto`)
    return true // Si no lanza error, el código existe
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return false // El código no existe
    }
    // Para otros errores, asumir que existe para evitar duplicados
    console.error("Error al verificar código de barras:", error)
    return true
  }
}

// Función para generar un código de barras aleatorio único
export const generarCodigoBarrasAleatorio = async (): Promise<string> => {
  const maxIntentos = 10
  let intentos = 0

  while (intentos < maxIntentos) {
    // Generar código de 13 dígitos (EAN-13)
    const codigo = Math.random().toString().slice(2, 15).padStart(13, '0')
    
    // Verificar si ya existe
    const existe = await verificarCodigoBarrasExiste(codigo)
    
    if (!existe) {
      return codigo
    }
    
    intentos++
  }

  // Si no se pudo generar un código único después de varios intentos,
  // usar timestamp para mayor unicidad
  const timestamp = Date.now().toString()
  const random = Math.random().toString().slice(2, 8)
  return (timestamp + random).slice(-13).padStart(13, '0')
}
