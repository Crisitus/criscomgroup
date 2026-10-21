const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { verificarRolesSinHorario } = require("../middlewares/restricciones.middleware");
const { registrarAuditoria, capturarEstadoOriginal } = require("../middlewares/audit.middleware");
const { SolicitudPostventa } = require("../models");
const controller = require("../controllers/postventa.controller");

const router = express.Router();
// Postventa contiene datos personales del consumidor. Lectura: Gerencia, Administracion,
// Auditoria (solo lectura) o concesion del area atencion_cliente.
const lectura = verificarRolesSinHorario([1, 2], "atencion_cliente");
// Escritura: sin la equivalencia de auditor del middleware compartido (rol 5 no escribe).
const escritura = (req, res, next) => {
  const u = req.user;
  const permitido = u && ([1, 2].includes(u.id_role) || u.area_grants?.includes("atencion_cliente") || u.superusuario_temporal);
  if (!permitido) return res.status(403).json({ message: "No tienes permisos para modificar solicitudes de postventa" });
  return next();
};

router.use(authMiddleware);
router.get("/", lectura, controller.listAdmin);
router.get("/:id(\\d+)", lectura, controller.getAdmin);
router.put("/:id(\\d+)", escritura, capturarEstadoOriginal(SolicitudPostventa, "id"), registrarAuditoria("actualizar", "solicitudes_postventa"), controller.updateAdmin);
module.exports = router;
