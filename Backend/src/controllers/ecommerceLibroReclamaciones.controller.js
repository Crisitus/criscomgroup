const svc = require("../services/reclamaciones.service");

// Se lee en cada peticion (no al arrancar) para que apagar el flag cierre la recepcion de inmediato.
const libroHabilitado = () => process.env.FEATURE_LIBRO_RECLAMACIONES === "true";

const ecommerceLibroReclamacionesController = {
  // Crear una nueva hoja de reclamacion desde el ecommerce (publico).
  create: async (req, res) => {
    try {
      // Con el flag apagado el ERP no puede leer lo recibido: no aceptamos nada.
      if (!libroHabilitado()) {
        return res.status(503).json({ message: "El Libro de Reclamaciones no está disponible por ahora. Escríbenos por nuestros canales de atención." });
      }
      const body = req.body || {};
      // Honeypot: un bot rellena el campo oculto; respondemos como si hubiera funcionado.
      if (typeof body.website === "string" && body.website.trim() !== "") {
        return res.status(201).json({
          success: true,
          codigo: `LR-${svc.hoyLima().slice(0, 4)}-000000`,
          fecha: svc.iso(new Date()),
          message: "Hoja de reclamación registrada correctamente",
        });
      }
      const { errores, datos } = svc.validar(body);
      if (Object.keys(errores).length) {
        return res.status(400).json({ message: "Revisa los campos marcados.", errores });
      }
      if (await svc.existeDuplicado(datos.email, datos.descripcion)) {
        return res.status(409).json({ message: "Ya registraste esta misma hoja en las últimas 24 horas. Revisa tu correo para ver el código." });
      }
      const hoja = await svc.crear(datos);
      const correo = await svc.enviarCorreo(svc.mensajeCopia(hoja));
      return res.status(201).json({
        success: true,
        codigo: hoja.codigo,
        fecha: svc.iso(hoja.fecha),
        fecha_vencimiento: String(hoja.fecha_vencimiento).slice(0, 10),
        correo,
        message: "Hoja de reclamación registrada correctamente",
      });
    } catch (error) {
      console.error("Error al crear reclamación desde ecommerce:", error);
      return res.status(500).json({ message: "No se pudo registrar la hoja de reclamación" });
    }
  },
};

module.exports = ecommerceLibroReclamacionesController;
