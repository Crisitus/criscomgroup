const express = require("express");
const router = express.Router();
const marketingController = require("../controllers/marketing.controller");
const bannerController = require("../controllers/banner.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { verificarHorarioOArea, verificarRolesSinHorario } = require("../middlewares/restricciones.middleware");
const { registrarAuditoria, capturarEstadoOriginal } = require("../middlewares/audit.middleware");
const upload = require("../middlewares/upload.middleware");
const features = require("../config/features");
const Banner = require("../models/banner.model");
const Tarjeta = require("../models/tarjeta.model");

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Middleware condicional para upload de banner (errores de multer y firma del archivo en JSON 400)
const bannerUpload = upload.bannerUpload('imagen_banner');
const conditionalUploadBanner = (req, res, next) => {
  const contentType = req.get('Content-Type');
  if (contentType && contentType.includes('multipart/form-data')) {
    return bannerUpload(req, res, next);
  }
  next();
};

// Middleware condicional para upload de tarjeta
const conditionalUploadTarjeta = (req, res, next) => {
  const contentType = req.get('Content-Type');
  if (contentType && contentType.includes('multipart/form-data')) {
    return upload.single('imagen_tarjeta')(req, res, next);
  }
  next();
};

// ==== NUEVAS RUTAS PARA MULTIPLES BANNERS (CARRUSEL) ====

// Listar todos los banners
router.get("/banners", verificarRolesSinHorario([1, 2], "marketing"), bannerController.getAll);
// Obtener un banner por id
router.get("/banners/:id", verificarRolesSinHorario([1, 2], "marketing"), bannerController.getById);
// Crear un banner
router.post(
  "/banners",
  verificarHorarioOArea("marketing"),
  conditionalUploadBanner,
  registrarAuditoria("crear", "banners"),
  bannerController.create
);
// Actualizar un banner
router.put(
  "/banners/:id",
  verificarHorarioOArea("marketing"),
  conditionalUploadBanner,
  capturarEstadoOriginal(Banner),
  registrarAuditoria("actualizar", "banners"),
  bannerController.update
);
// Eliminar un banner
router.delete(
  "/banners/:id",
  verificarHorarioOArea("marketing"),
  capturarEstadoOriginal(Banner),
  registrarAuditoria("eliminar", "banners"),
  bannerController.delete
);
// Reordenar en bloque (debe ir antes de las rutas con :id)
router.patch(
  "/banners/reordenar",
  verificarHorarioOArea("marketing"),
  registrarAuditoria("actualizar", "banners"),
  bannerController.reorder
);
// Publicar / ocultar rapido
router.patch(
  "/banners/:id/activo",
  verificarHorarioOArea("marketing"),
  capturarEstadoOriginal(Banner),
  registrarAuditoria("actualizar", "banners"),
  bannerController.setActivo
);
// Actualizar solo el WhatsApp del banner indicado
router.patch(
  "/banners/:id/whatsapp",
  verificarHorarioOArea("marketing"),
  capturarEstadoOriginal(Banner),
  registrarAuditoria("actualizar", "banners"),
  bannerController.updateWhatsapp
);

// ==== RUTAS PARA TARJETAS (solo con FEATURE_MARKETING) ====
if (features.FEATURE_MARKETING) {

// Rutas de solo lectura (no requieren horario laboral para rol 3)
router.get("/tarjetas", verificarRolesSinHorario([1, 2], "marketing"), marketingController.getAllTarjetas);
router.get("/tarjetas/:id", verificarRolesSinHorario([1, 2], "marketing"), marketingController.getTarjetaById);

// Rutas que requieren horario laboral para rol 3 (crear/editar/eliminar)
router.post(
  "/tarjetas",
  verificarHorarioOArea("marketing"),
  conditionalUploadTarjeta,
  registrarAuditoria("crear", "tarjetas"),
  marketingController.createTarjeta
);

router.put(
  "/tarjetas/:id",
  verificarHorarioOArea("marketing"),
  conditionalUploadTarjeta,
  capturarEstadoOriginal(Tarjeta),
  registrarAuditoria("actualizar", "tarjetas"),
  marketingController.updateTarjeta
);

router.delete(
  "/tarjetas/:id/imagen",
  verificarHorarioOArea("marketing"),
  capturarEstadoOriginal(Tarjeta),
  registrarAuditoria("actualizar", "tarjetas"),
  marketingController.deleteTarjetaImage
);

router.delete(
  "/tarjetas/:id",
  verificarHorarioOArea("marketing"),
  capturarEstadoOriginal(Tarjeta),
  registrarAuditoria("eliminar", "tarjetas"),
  marketingController.deleteTarjeta
);
}

module.exports = router;
