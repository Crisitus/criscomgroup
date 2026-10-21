// Registro ligero de exportaciones hechas en el navegador (Tickets PDF / Excel de productos).
// Solo guarda tipo, cantidad y filtros saneados: nada de datos de productos ni de personas.
const TIPOS = ["tickets_pdf", "productos_excel"]
const MAX_CANTIDAD = 100000
const FILTROS_PERMITIDOS = [
  "busqueda", "categoria", "precioMin", "precioMax", "soloConStock", "soloOfertas",
  "soloModificados", "ordenamiento", "copias", "producidos", "sinCodigoBarras",
]

const limpiarFiltros = (raw) => {
  const out = {}
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out
  for (const key of FILTROS_PERMITIDOS) {
    const v = raw[key]
    if (typeof v === "string") out[key] = v.trim().slice(0, 100)
    else if (typeof v === "boolean") out[key] = v
    else if (typeof v === "number" && Number.isFinite(v)) out[key] = v
  }
  return out
}

const registrar = async (req, res) => {
  try {
    const { tipo, cantidad, filtros } = req.body || {}
    const errores = {}
    if (!TIPOS.includes(tipo)) errores.tipo = `El tipo debe ser uno de: ${TIPOS.join(", ")}`
    const n = Number(cantidad)
    if (!Number.isInteger(n) || n < 0 || n > MAX_CANTIDAD) errores.cantidad = `La cantidad debe ser un entero entre 0 y ${MAX_CANTIDAD}`
    if (Object.keys(errores).length) {
      return res.status(400).json({ message: "Datos de exportación no válidos", errores })
    }
    // El middleware de auditoría lee req.body al terminar: se deja solo lo saneado.
    req.body = { tipo, cantidad: n, filtros: limpiarFiltros(filtros) }
    return res.status(201).json({ message: "Exportación registrada", registrado: true, ...req.body })
  } catch (error) {
    console.error("Error al registrar exportación:", error)
    return res.status(500).json({ message: "Error al registrar la exportación" })
  }
}

module.exports = { registrar, limpiarFiltros, TIPOS }
