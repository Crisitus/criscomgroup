const express = require("express")
const router = express.Router()
const productoController = require("../controllers/producto.controller")
const { validateProducto, validateStock } = require("../middlewares/validate.middleware")
const authMiddleware = require("../middlewares/auth.middleware")
const { verificarHorarioLaboral, verificarHorarioOArea, verificarRolesSinHorario } = require("../middlewares/restricciones.middleware")
const { registrarAuditoria, capturarEstadoOriginal } = require("../middlewares/audit.middleware")
const upload = require("../middlewares/upload.middleware")
const Producto = require("../models/producto.model")

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware)

// Middleware condicional para upload
const conditionalUpload = (req, res, next) => {
  const contentType = req.get('Content-Type');
  if (contentType && contentType.includes('multipart/form-data')) {
    return upload.single('imagen')(req, res, next);
  }
  next();
};

// Registro de exportaciones (Tickets PDF / Excel): POST /api/productos/exportaciones/registro
router.use("/exportaciones", require("./exportaciones.routes"))

// Rutas de solo lectura (no requieren horario laboral para rol 3)
router.get("/", verificarRolesSinHorario([1, 2, 3], 'inventario'), productoController.getAll)
router.get("/categoria/:id_categoria", verificarRolesSinHorario([1, 2, 3], 'inventario'), productoController.getByCategoria)
router.get("/:id", verificarRolesSinHorario([1, 2, 3], 'inventario'), productoController.getById)

// Rutas que requieren horario laboral para rol 3 (crear/editar/eliminar)
router.post("/", verificarHorarioOArea('inventario'), conditionalUpload, validateProducto, registrarAuditoria("crear", "productos"), productoController.create)
router.post('/asignar-oferta', verificarHorarioOArea('inventario'), productoController.setOferta)
router.patch(
  "/:id/stock",
  verificarHorarioOArea('inventario'),
  validateStock,
  capturarEstadoOriginal(Producto),
  registrarAuditoria("actualizar", "productos"),
  productoController.updateStock,
)
router.patch(
  "/:id/decrement",
  verificarHorarioOArea('inventario'),
  capturarEstadoOriginal(Producto),
  registrarAuditoria("actualizar", "productos"),
  productoController.decrementStock,
)
router.put(
  "/:id",
  verificarHorarioOArea('inventario'),
  conditionalUpload,
  validateProducto,
  capturarEstadoOriginal(Producto),
  registrarAuditoria("actualizar", "productos"),
  productoController.update,
)
router.patch(
  "/:id",
  verificarHorarioOArea('inventario'),
  conditionalUpload,
  capturarEstadoOriginal(Producto),
  registrarAuditoria("actualizar", "productos"),
  productoController.update,
)
router.delete(
  "/:id/imagen",
  verificarHorarioOArea('inventario'),
  capturarEstadoOriginal(Producto),
  registrarAuditoria("actualizar", "productos"),
  productoController.deleteImage,
)
router.delete(
  "/:id",
  verificarHorarioOArea('inventario'),
  capturarEstadoOriginal(Producto),
  registrarAuditoria("eliminar", "productos"),
  productoController.delete,
)

module.exports = router


