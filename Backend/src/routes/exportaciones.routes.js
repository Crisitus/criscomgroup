const express = require("express")
const router = express.Router()
const controller = require("../controllers/exportaciones.controller")
const authMiddleware = require("../middlewares/auth.middleware")
const { verificarRolesSinHorario } = require("../middlewares/restricciones.middleware")
const { registrarAuditoria } = require("../middlewares/audit.middleware")

// POST /registro  { tipo: "tickets_pdf" | "productos_excel", cantidad, filtros }
// Montado hoy dentro de /api/productos/exportaciones (producto.routes.js);
// tambien puede montarse como /api/exportaciones en app.js.
router.post(
  "/registro",
  authMiddleware,
  verificarRolesSinHorario([1, 2], "inventario"),
  registrarAuditoria("exportar", "exportaciones"),
  controller.registrar,
)

module.exports = router
