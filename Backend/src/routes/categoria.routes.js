const express = require("express")
const router = express.Router()
const categoriaController = require("../controllers/categoria.controller")
const { validateCategoria } = require("../middlewares/validate.middleware")
const authMiddleware = require("../middlewares/auth.middleware")
const { verificarHorarioLaboral, verificarHorarioOArea, verificarRolesSinHorario } = require("../middlewares/restricciones.middleware")
const { registrarAuditoria, capturarEstadoOriginal } = require("../middlewares/audit.middleware")
const upload = require("../middlewares/upload.middleware")
const Categoria = require("../models/categoria.model")

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware)

// Middleware condicional para upload
const conditionalUpload = (req, res, next) => {
  const contentType = req.get('Content-Type');
  if (contentType && contentType.includes('multipart/form-data')) {
    return upload.single('imagen_categoria')(req, res, next);
  }
  next();
};

// Rutas de solo lectura (no requieren horario laboral para rol 3)
router.get("/", verificarRolesSinHorario([1, 2, 3], 'inventario'), categoriaController.getAll)
router.get("/:id", verificarRolesSinHorario([1, 2, 3], 'inventario'), categoriaController.getById)

// Rutas que requieren horario laboral para rol 3 (crear/editar/eliminar)
router.post("/", verificarHorarioOArea('inventario'), conditionalUpload, validateCategoria, registrarAuditoria("crear", "categorias"), categoriaController.create)
router.put(
  "/:id",
  verificarHorarioOArea('inventario'),
  conditionalUpload,
  validateCategoria,
  capturarEstadoOriginal(Categoria),
  registrarAuditoria("actualizar", "categorias"),
  categoriaController.update,
)
router.patch(
  "/:id",
  verificarHorarioOArea('inventario'),
  conditionalUpload,
  capturarEstadoOriginal(Categoria),
  registrarAuditoria("actualizar", "categorias"),
  categoriaController.update,
)
router.delete(
  "/:id/imagen",
  verificarHorarioOArea('inventario'),
  capturarEstadoOriginal(Categoria),
  registrarAuditoria("actualizar", "categorias"),
  categoriaController.deleteImage,
)
router.delete(
  "/:id",
  verificarHorarioOArea('inventario'),
  capturarEstadoOriginal(Categoria),
  registrarAuditoria("eliminar", "categorias"),
  categoriaController.delete,
)

module.exports = router

