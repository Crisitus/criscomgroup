const express = require("express");
const router = express.Router();
const ecommerceController = require("../controllers/ecommerce.controller");
const shippingQuote = require('../services/shipping-quote.service');
const { publicSubmissionLimiter } = require("../middlewares/security.middleware");
const ordenServicioPublic = require("../controllers/ordenServicioPublic.controller");

// Rutas públicas de ecommerce (sin autenticación)
// Estas APIs están diseñadas para ser consumidas por un frontend de ecommerce público

// Obtener todos los productos para ecommerce
router.get("/productos", ecommerceController.getProducts);
router.get("/estadisticas-publicas", ecommerceController.getPublicStats);
router.post('/shipping-quote', async (req, res) => {
  try {
    return res.json({ success: true, ...(await shippingQuote.quote(req.body)) });
  } catch (error) {
    return res.status(422).json({ success: false, message: error.message });
  }
});

// Obtener todas las categorías para ecommerce
router.get("/categorias", ecommerceController.getCategories);

// Obtener productos por categoría para ecommerce
router.get("/categorias/:id_categoria/productos", ecommerceController.getProductsByCategory);

// Obtener un producto específico para ecommerce
router.get("/productos/:id", ecommerceController.getProductById);

// Obtener productos en oferta para ecommerce
router.get("/ofertas", ecommerceController.getOffersProducts);

// Obtener el banner para ecommerce
router.get("/banner", ecommerceController.getBannerPublic);

// Config pública de empresa (nombre comercial, dirección, horario, teléfono/WhatsApp y redes).
// Sin auth; solo campos públicos (nunca RUC, secretos SUNAT/Culqi ni credenciales).
const ecommerceConfigController = require("../controllers/ecommerceConfig.controller");
router.get("/config-publica", ecommerceConfigController.getConfigPublica);

// Obtener todos los banners para ecommerce (carrusel)
router.get("/banners", ecommerceController.getBannersPublic);

// Obtener todas las tarjetas para ecommerce
router.get("/tarjetas", ecommerceController.getTarjetasPublic);


// Enviar reclamación desde el ecommerce
const ecommerceLibroReclamacionesController = require("../controllers/ecommerceLibroReclamaciones.controller");
router.post("/libro-reclamaciones", publicSubmissionLimiter, ecommerceLibroReclamacionesController.create);
const postventaController = require("../controllers/postventa.controller");
router.post("/postventa", publicSubmissionLimiter, postventaController.createPublic);
const { trackLimiter: postventaTrackLimiter } = require("../services/postventa.service");
router.post("/postventa/seguimiento", postventaTrackLimiter, postventaController.trackPublicPost);
router.get("/postventa/seguimiento/:codigo", postventaTrackLimiter, postventaController.trackPublic);

// Obtener una tarjeta específica por ID para ecommerce
router.get("/tarjetas/:id", ecommerceController.getTarjetaByIdPublic);

// ---------------------------------------------------------------------------
// Solicitudes de importación — MVP público (hot-patch B)
// POST crea solicitud sin auth y devuelve codigo_seguimiento único.
// GET seguimiento/:codigo devuelve vista pública del estado.
// Cubierto por: __tests__/integration/solicitudes-importacion.test.js
// ---------------------------------------------------------------------------
const solicitudImportacionController = require("../controllers/solicitudImportacion.controller");
router.post("/solicitudes-importacion", publicSubmissionLimiter, solicitudImportacionController.create);
const { trackLimiter: solicitudTrackLimiter } = require("../services/solicitud.service");
router.get("/seguimiento/:codigo", solicitudTrackLimiter, solicitudImportacionController.getBySeguimiento);
router.post("/seguimiento", solicitudTrackLimiter, solicitudImportacionController.trackPost);
const solicitudServicioController = require('../controllers/solicitudServicio.controller');
router.post('/solicitudes-servicio', publicSubmissionLimiter, solicitudServicioController.createPublic);
router.get('/servicio-tecnico/seguimiento/:token', ordenServicioPublic.track);
router.get('/servicio-tecnico/seguimiento/:token/evidencias/:evidenceId', ordenServicioPublic.evidenceFile);

// ---------------------------------------------------------------------------
// Solicitudes de armado / ensamble de PC — público
// POST crea la solicitud (modo marketplace o presupuesto) y devuelve
// codigo_seguimiento (formato ARM-AAAAMMDD-XXXXXX).
// GET seguimiento-ensamble/:codigo devuelve la vista pública del estado.
// ---------------------------------------------------------------------------
const solicitudEnsambleController = require("../controllers/solicitudEnsamble.controller");
router.post("/solicitudes-ensamble", publicSubmissionLimiter, solicitudEnsambleController.create);
router.get("/seguimiento-ensamble/:codigo", solicitudTrackLimiter, solicitudEnsambleController.getBySeguimiento);
router.post("/seguimiento-ensamble", solicitudTrackLimiter, solicitudEnsambleController.trackPost);

// ---------------------------------------------------------------------------
// Stubs para endpoints consumidos por el Ecommerce (Next.js) pero aún no
// implementados en el ERP. Devuelven respuestas vacías pero válidas
// (200 + [] o 200 + null) para que la UI no rompa con 404.
//
// Cuando se implemente cada módulo real (ciclo ecommerce-features dedicado),
// estos stubs deben reemplazarse por endpoints reales con su controller/model.
// Cubierto por: __tests__/integration/ecommerce-stubs.test.js
// ---------------------------------------------------------------------------
// mis-solicitudes real (auth cliente JWT): importación + ensamble + servicio técnico del cliente.
// Cubierto por: __tests__/integration/ecom-mis-solicitudes.test.js
router.get("/mis-solicitudes", ecommerceController.misSolicitudes);

router.get("/testimonials", (_req, res) => res.json([]));
router.get("/contacts", (_req, res) => res.json([]));
router.get("/featured-category", (_req, res) => res.json(null));
router.get("/solicitudes-importacion", (_req, res) => res.json([]));
// Alias legado del stub: mismo handler real (requiere auth).
router.get("/solicitudes-importacion/mis-solicitudes", ecommerceController.misSolicitudes);
router.get("/solicitudes-importacion/admin", (_req, res) => res.json([]));
router.get("/solicitudes-importacion/admin/estadisticas", (_req, res) => res.json({}));
// /claims: alias informativo del ecommerce anterior. Hasta que se defina el
// mapeo real a libro-reclamaciones (o se cree su propio controller), stub vacío.
router.get("/claims", (_req, res) => res.json([]));

module.exports = router;
