import api from "../lib/api"

// Función para generar SKU aleatorio basado en categoría
export const generarSkuAleatorio = async (idCategoria: number): Promise<string> => {
  const maxIntentos = 20 // Aumentar intentos para mayor seguridad
  let intentos = 0

  while (intentos < maxIntentos) {
    try {
      // Obtener información de la categoría
      const categoriaResponse = await api.get(`/categorias/${idCategoria}`)
      const categoria = categoriaResponse.data
      
      // Crear prefijo basado en el nombre de la categoría
      const palabrasOriginales = categoria.nombre.toLowerCase().split(' ').filter((p: string) => p.length > 0)
      
      // Filtrar palabras conectoras comunes
      const palabrasConectoras = ['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'con', 'para', 'en', 'a', 'al']
      const palabras = palabrasOriginales.filter((p: string) => !palabrasConectoras.includes(p))
      
      let prefijo = ''
      
      if (palabras.length === 1) {
        // Una sola palabra: primera + medio + última
        const palabra = palabras[0]
        const primera = palabra.charAt(0)
        let medio = ''
        let ultima = ''
        
        if (palabra.length === 1) {
          // Si solo tiene 1 letra, repetirla 3 veces
          prefijo = (primera + primera + primera).toUpperCase()
        } else if (palabra.length === 2) {
          // Si tiene 2 letras, usar primera + primera + segunda
          medio = palabra.charAt(0)
          ultima = palabra.charAt(1)
          prefijo = (primera + medio + ultima).toUpperCase()
        } else {
          // Si tiene 3 o más letras, usar primera + medio + última
          medio = palabra.charAt(Math.floor(palabra.length / 2))
          ultima = palabra.charAt(palabra.length - 1)
          prefijo = (primera + medio + ultima).toUpperCase()
        }
      } else {
        // Múltiples palabras: primera + última de la primera palabra + primera de la segunda
        const primeraPalabra = palabras[0]
        const segundaPalabra = palabras[1]
        
        const primera = primeraPalabra.charAt(0)
        const ultimaPrimera = primeraPalabra.charAt(primeraPalabra.length - 1)
        const primeraSegunda = segundaPalabra.charAt(0)
        
        prefijo = (primera + ultimaPrimera + primeraSegunda).toUpperCase()
      }
      
      // Generar número aleatorio de 4 dígitos con mayor variabilidad
      let numeroAleatorio: number
      if (intentos < 10) {
        // Primeros 10 intentos: números normales
        numeroAleatorio = Math.floor(1000 + Math.random() * 9000)
      } else {
        // Después de 10 intentos: usar timestamp para mayor unicidad
        const timestamp = Date.now().toString()
        const timestampSuffix = timestamp.slice(-4)
        numeroAleatorio = parseInt(timestampSuffix) + Math.floor(Math.random() * 100)
        // Asegurar que tenga 4 dígitos
        numeroAleatorio = Math.max(1000, Math.min(9999, numeroAleatorio))
      }
      
      // Crear SKU con formato: PREFIJO-NNNN
      const sku = `${prefijo}-${numeroAleatorio}`
      
      // Verificar si el SKU ya existe
      const existe = await verificarSkuExiste(sku)
      
      if (!existe) {
        return sku
      }
      
      intentos++
    } catch (error) {
      console.error("Error al generar SKU:", error)
      intentos++
    }
  }

  // Si no se pudo generar un SKU único después de varios intentos,
  // usar timestamp completo para máxima unicidad
  const timestamp = Date.now().toString()
  const random = Math.random().toString().slice(2, 6) // 4 dígitos aleatorios
  const fallbackSku = `PRD-${timestamp.slice(-4)}${random.slice(0, 2)}`
  
  console.warn(`No se pudo generar SKU único después de ${maxIntentos} intentos. Usando SKU de respaldo: ${fallbackSku}`)
  return fallbackSku
}

// Función para verificar si un SKU ya existe
export const verificarSkuExiste = async (sku: string): Promise<boolean> => {
  try {
    // Usar una búsqueda más específica para verificar el SKU
    const response = await api.get('/productos', {
      params: {
        sku: sku
      }
    })
    
    // Si la API soporta filtrado por SKU, verificar si hay resultados
    if (response.data && Array.isArray(response.data)) {
      return response.data.some((producto: any) => producto.sku === sku)
    }
    
    // Si no hay datos, asumir que no existe
    return false
  } catch (error: any) {
    // Si hay error 404, el SKU no existe
    if (error.response && error.response.status === 404) {
      return false
    }
    
    // Si hay otros errores, intentar con el método original
    try {
      const response = await api.get('/productos')
      const productos = response.data
      return productos.some((producto: any) => producto.sku === sku)
    } catch (fallbackError: any) {
      console.error("Error al verificar SKU:", fallbackError)
      // En caso de error completo, asumir que existe para evitar duplicados
      return true
    }
  }
}
