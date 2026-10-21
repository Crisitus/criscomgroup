const express = require("express")
const router = express.Router()
const codigoBarrasController = require("../controllers/codigo_barras.controller")
const authMiddleware = require("../middlewares/auth.middleware")
const { verificarHorarioOArea, verificarRolesSinHorario } = require("../middlewares/restricciones.middleware")
const { registrarAuditoria, capturarEstadoOriginal } = require("../middlewares/audit.middleware")
const CodigoBarras = require("../models/codigo_barras.model")

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware)

// Rutas de solo lectura (no requieren horario laboral para rol 3)
router.get("/producto/:id_producto", verificarRolesSinHorario([1, 2, 3], 'inventario'), codigoBarrasController.obtenerCodigosBarras)
router.get("/:codigo/producto", verificarRolesSinHorario([1, 2, 3], 'inventario'), codigoBarrasController.buscarProductoPorCodigoBarras)

// Rutas que requieren horario laboral para rol 3 (crear/editar/eliminar)
router.post(
  "/producto/:id_producto",
  verificarHorarioOArea('inventario'),
  registrarAuditoria("crear", "codigos_barras"),
  codigoBarrasController.agregarCodigosBarras,
)
router.put(
  "/:codigo/cantidad",
  verificarHorarioOArea('inventario'),
  capturarEstadoOriginal(CodigoBarras, "codigo"),  // Especificar que el parámetro es 'codigo' en lugar de 'id'
  registrarAuditoria("actualizar", "codigos_barras"),
  codigoBarrasController.actualizarCantidad,
)
router.put(
  "/actualizar-multiple",
  verificarHorarioOArea('inventario'),
  capturarEstadoOriginal(CodigoBarras),  // Este caso es especial, se maneja en el middleware
  registrarAuditoria("actualizar", "codigos_barras"),
  codigoBarrasController.actualizarMultiplesCantidades,
)
// Ruta DELETE para eliminar código de barras individual por código
router.delete(
  "/codigo/:codigo",
  verificarHorarioOArea('inventario'),
  capturarEstadoOriginal(CodigoBarras, "codigo"),
  registrarAuditoria("eliminar", "codigos_barras"),
  codigoBarrasController.eliminarCodigoBarras,
)

// Ruta DELETE para eliminar código de barras individual por ID
router.delete(
  "/:id",
  verificarHorarioOArea('inventario'),
  capturarEstadoOriginal(CodigoBarras, "id"),
  registrarAuditoria("eliminar", "codigos_barras"),
  codigoBarrasController.eliminarCodigoBarrasPorId,
)

module.exports = router