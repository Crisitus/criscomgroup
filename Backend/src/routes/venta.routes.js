const express = require("express")
const router = express.Router()
const ventaController = require("../controllers/venta.controller")
const { validateVenta } = require("../middlewares/validate.middleware")
const authMiddleware = require("../middlewares/auth.middleware")
const { verificarHorarioLaboral, verificarHorarioOArea, verificarRolesSinHorario } = require("../middlewares/restricciones.middleware")
const { registrarAuditoria, capturarEstadoOriginal } = require("../middlewares/audit.middleware")
const Venta = require("../models/venta.model")

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware)

// Rutas que requieren horario laboral para rol 3 (crear ventas)
router.post("/", verificarHorarioOArea('ventas'), validateVenta, registrarAuditoria("crear", "ventas"), ventaController.create)
router.post(
  "/comprobante/:venta_id",
  verificarHorarioOArea('ventas'),
  capturarEstadoOriginal(Venta),
  registrarAuditoria("actualizar", "ventas"),
  ventaController.generateComprobante,
)

// NUEVA RUTA: Actualizar estado del comprobante después del envío a SUNAT
router.patch(
  "/actualizar-comprobante/:venta_id",
  verificarRolesSinHorario([1, 2, 3], 'ventas'),
  capturarEstadoOriginal(Venta, "venta_id"),
  registrarAuditoria("actualizar_comprobante", "ventas"),
  ventaController.updateComprobanteStatus
)

// Ruta para generar ticket de venta (no comprobante fiscal)
router.get("/ticket/:venta_id", verificarRolesSinHorario([1, 2, 3], 'ventas'), ventaController.generateTicketVenta)

// Rutas de solo lectura (no requieren horario laboral para rol 3)
router.get("/", verificarRolesSinHorario([1, 2, 3], 'ventas'), ventaController.getAll)
router.get("/rango-fechas", verificarRolesSinHorario([1, 2, 3], 'ventas'), ventaController.getByDateRange)
router.get("/cajero/:id_cajero", verificarRolesSinHorario([1, 2, 3], 'ventas'), ventaController.getByCajero)
router.get("/fecha/:fecha", verificarRolesSinHorario([1, 2, 3], 'ventas'), ventaController.getByDate)
router.get("/:id", verificarRolesSinHorario([1, 2, 3], 'ventas'), ventaController.getById)
router.get("/comprobantes/cliente/:documento", verificarRolesSinHorario([1, 2, 3], 'ventas'), ventaController.getComprobantesByCliente)
router.get("/ultimo-correlativo/:tipoDocumento", verificarRolesSinHorario([1, 2, 3], 'ventas'), ventaController.getLastCorrelativo)

// Ruta para eliminar ventas (solo gerentes - rol 1)
router.delete(
  "/:id",
  verificarRolesSinHorario([1]),
  capturarEstadoOriginal(Venta),
  registrarAuditoria("eliminar", "ventas"),
  ventaController.delete
)

module.exports = router


