const express = require("express")
const router = express.Router()
const auditLogController = require("../controllers/audit_log.controller")
const authMiddleware = require("../middlewares/auth.middleware")
const masterAccess = require("../middlewares/master.middleware")

// Lectura: rol 1, rol 5 (auditor), superusuario temporal o area delegada 'auditoria'.
// Purga: solo la cuenta maestra real (rol 1); el controller lo vuelve a verificar.
router.use(authMiddleware, (req, res, next) => {
  if (req.user && ([1, 5].includes(req.user.id_role) || req.user.superusuario_temporal || req.user.area_grants?.includes("auditoria"))) {
    return next()
  }
  return res.status(403).json({ message: "Acceso denegado. No tienes permiso para ver los logs de auditoría." })
})

// Rutas estaticas antes de /:id
router.get("/", auditLogController.list)
router.get("/permisos", auditLogController.permisos)
router.get("/catalogo", auditLogController.catalogo)
router.get("/stats", auditLogController.getLogStats)
router.get("/export.csv", auditLogController.exportCsv)
router.get("/usuario/:usuario_id", auditLogController.getByUser)
router.get("/tabla/:tabla", auditLogController.getByTable)
router.get("/accion/:accion", auditLogController.getByAction)
router.get("/rango-fechas", auditLogController.getByDateRange)
router.get("/:id(\\d+)", auditLogController.getOne)
router.delete("/", masterAccess, auditLogController.purge)

module.exports = router
