const express = require("express")
const router = express.Router()
const userController = require("../controllers/user.controller")
const authMiddleware = require("../middlewares/auth.middleware")
const { verificarRolesSinHorario } = require("../middlewares/restricciones.middleware")
const { registrarAuditoria, capturarEstadoOriginal } = require("../middlewares/audit.middleware")
const { masterAccountLimiter } = require("../middlewares/security.middleware")
const User = require("../models/user.model")
const masterAccess = require("../middlewares/master.middleware")
const { exactMaster } = masterAccess

// Niveles de acceso por ruta:
//   exactMaster  -> solo la cuenta maestra real (rol 1 + MASTER_ADMIN_EMAIL)
//   masterAccess -> maestra real O rol 2 con superusuario temporal vigente; el controlador
//                   aplica ademas las reglas de actor (el rol 2 elevado nunca toca roles 1-2 ni a si mismo).
router.get('/master-account', authMiddleware, exactMaster, userController.getMasterAccount)
router.patch('/master-account', authMiddleware, exactMaster, masterAccountLimiter, registrarAuditoria('actualizar_cuenta_maestra', 'usuarios'), userController.updateMasterAccount)

// Lecturas (maestra real o rol 2 elevado)
router.get("/", authMiddleware, masterAccess, userController.getAllUsers)
router.get("/vendors/stats", authMiddleware, masterAccess, userController.getVendorsWithStats)
router.get("/:id/basic", authMiddleware, verificarRolesSinHorario([1, 2, 3]), userController.getUserBasicInfo)
router.get("/:id", authMiddleware, verificarRolesSinHorario([1, 2, 3]), userController.getUserById)

// Escrituras
router.post("/", authMiddleware, masterAccess, registrarAuditoria("crear", "usuarios"), userController.createUser)
router.put("/:id", authMiddleware, masterAccess, capturarEstadoOriginal(User), registrarAuditoria("actualizar", "usuarios"), userController.updateUser)
router.patch("/:id/role", authMiddleware, masterAccess, capturarEstadoOriginal(User), registrarAuditoria("actualizar_rol", "usuarios"), userController.changeUserRole)
router.patch("/:id/access-profile", authMiddleware, masterAccess, capturarEstadoOriginal(User), registrarAuditoria("configurar_acceso", "usuarios"), userController.configureAccess)
router.patch("/:id/temporary-superuser", authMiddleware, exactMaster, capturarEstadoOriginal(User), registrarAuditoria("configurar_superusuario_temporal", "usuarios"), userController.configureTemporarySuperuser)
router.patch("/:id/status", authMiddleware, exactMaster, capturarEstadoOriginal(User), registrarAuditoria("cambiar_estado", "usuarios"), userController.setUserStatus)
router.patch("/:id/inventory", authMiddleware, masterAccess, registrarAuditoria("asignar_inventario", "usuarios"), userController.assignInventory)
router.patch("/:id", authMiddleware, masterAccess, capturarEstadoOriginal(User), registrarAuditoria("actualizar", "usuarios"), userController.patchUser)
router.delete("/:id", authMiddleware, exactMaster, capturarEstadoOriginal(User), registrarAuditoria("eliminar", "usuarios"), userController.deleteUser)

module.exports = router
