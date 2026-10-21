const express = require("express")
const { register, registerCustomer, login, googleLogin, me } = require("../controllers/auth.controller")
const { check } = require("express-validator")
const { registrarLogin, registrarAuditoria } = require("../middlewares/audit.middleware")
const authMiddleware = require("../middlewares/auth.middleware")
const { manager } = require("../middlewares/master.middleware")

const router = express.Router()

// Alta de personal: mismas reglas que POST /users (la logica es la misma funcion). Solo gerente (rol 1) o
// rol 2 con superusuario temporal vigente, releidos de la BD; un Administrador normal ya no puede crear cuentas.
router.post(
  "/register",
  authMiddleware,
  manager,
  [
    check("name", "El nombre es obligatorio").not().isEmpty(),
    check("email", "Agrega un email valido").not().isEmpty().isEmail(),
    check("password", "La contraseña es obligatoria").not().isEmpty(),
  ],
  registrarAuditoria("crear", "usuarios"),
  register,
)

router.post(
  "/register-customer",
  [
    check("name", "El nombre es obligatorio").trim().notEmpty(),
    check("email", "Agrega un email valido").trim().isEmail().normalizeEmail(),
    check("password", "La contraseña debe tener al menos 6 caracteres").isLength({ min: 6, max: 128 }),
  ],
  registerCustomer,
)

router.get("/me", authMiddleware, me)
router.post("/login", registrarLogin, login)
router.post("/google", googleLogin)

module.exports = router
