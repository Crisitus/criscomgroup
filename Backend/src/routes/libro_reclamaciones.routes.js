const express = require("express");
const router = express.Router();
const libroReclamacionesController = require("../controllers/libro_reclamaciones.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { verificarRolesSinHorario } = require("../middlewares/restricciones.middleware");
const { registrarAuditoria, capturarEstadoOriginal } = require("../middlewares/audit.middleware");
const { LibroReclamaciones } = require("../models");

// La recepcion publica es solo POST /api/ecommerce/libro-reclamaciones.
// Esta informacion de consumidores se limita a gerencia y administracion (roles 1 y 2).
const guard = [authMiddleware, verificarRolesSinHorario([1, 2])];

router.get("/", ...guard, libroReclamacionesController.getAll);
router.get("/export.csv", ...guard, registrarAuditoria("exportar", "libro_reclamaciones"), libroReclamacionesController.exportCsv);
router.get("/:id(\\d+)", ...guard, libroReclamacionesController.getById);
router.put(
  "/:id(\\d+)",
  ...guard,
  capturarEstadoOriginal(LibroReclamaciones, "id"),
  registrarAuditoria("actualizar", "libro_reclamaciones"),
  libroReclamacionesController.update,
);
// Sin DELETE: archivar es un cambio de estado (PUT estado=archivado), que queda auditado.

module.exports = router;
