const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const crisitusOnly = require("../middlewares/crisitusOnly.middleware");
const { registrarAuditoria, capturarEstadoOriginal } = require("../middlewares/audit.middleware");
const { SolicitudEnsamble } = require("../models");
const controller = require("../controllers/solicitudEnsamble.controller");

// Área exclusiva de la cuenta maestra. No basta con un JWT, rol Gerente ni
// superusuario temporal: crisitusOnly verifica el correo protegido contra el
// usuario vigente de la base de datos.
router.use(authMiddleware, crisitusOnly);

router.get("/", controller.listAdmin);
router.get("/:id(\\d+)", controller.getAdmin);
router.put("/:id(\\d+)/estado", capturarEstadoOriginal(SolicitudEnsamble, "id"), registrarAuditoria("actualizar", "solicitudes_ensamble"), controller.updateEstadoAdmin);
router.post("/:id(\\d+)/convertir", registrarAuditoria("convertir", "solicitudes_ensamble"), controller.convertir);

module.exports = router;
