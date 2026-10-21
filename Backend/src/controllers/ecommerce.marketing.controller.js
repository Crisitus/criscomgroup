const { Banner, Tarjeta } = require("../models");

// Obtener el banner público para ecommerce
const getPublicBanner = async (req, res) => {
  try {
    const banner = await Banner.findOne({
      where: { activo: true },
      order: [['creado_en', 'DESC']]
    });
    
    if (!banner) {
      return res.status(404).json({ message: 'No hay banner disponible' });
    }
    
    // Generar URL completa para la imagen
    const bannerData = banner.toJSON();
    if (bannerData.imagen_url) {
      // Reutilizamos la función generarUrlCompleta con 'banner' como tipo
      bannerData.imagen_url = generarUrlCompleta(bannerData.imagen_url, req, 'banner');
    }
    
    return res.status(200).json(bannerData);
  } catch (error) {
    console.error('Error al obtener el banner para ecommerce:', error);
    return res.status(500).json({ 
      message: 'Error al obtener el banner',
      error: error.message 
    });
  }
};

// Obtener todas las tarjetas públicas para ecommerce
const getPublicTarjetas = async (req, res) => {
  try {
    const tarjetas = await Tarjeta.findAll({
      where: { activo: true },
      order: [['orden', 'ASC']]
    });
    
    // Generar URLs completas para las imágenes de cada tarjeta
    const tarjetasConImagenes = tarjetas.map(tarjeta => {
      const tarjetaData = tarjeta.toJSON();
      if (tarjetaData.imagen_url) {
        // Usamos la función de generación de URL con el tipo 'tarjetas'
        tarjetaData.imagen_url = generarUrlCompleta(tarjetaData.imagen_url, req, 'tarjetas');
      }
      return tarjetaData;
    });
    
    return res.status(200).json(tarjetasConImagenes);
  } catch (error) {
    console.error('Error al obtener tarjetas para ecommerce:', error);
    return res.status(500).json({ 
      message: 'Error al obtener tarjetas',
      error: error.message 
    });
  }
};

// Obtener una tarjeta específica por ID para ecommerce
const getPublicTarjetaById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const tarjeta = await Tarjeta.findOne({
      where: { 
        id_tarjeta: id,
        activo: true 
      }
    });
    
    if (!tarjeta) {
      return res.status(404).json({ message: 'Tarjeta no encontrada' });
    }
    
    // Generar URL completa para la imagen
    const tarjetaData = tarjeta.toJSON();
    if (tarjetaData.imagen_url) {
      tarjetaData.imagen_url = generarUrlCompleta(tarjetaData.imagen_url, req, 'tarjetas');
    }
    
    return res.status(200).json(tarjetaData);
  } catch (error) {
    console.error('Error al obtener la tarjeta para ecommerce:', error);
    return res.status(500).json({ 
      message: 'Error al obtener la tarjeta',
      error: error.message 
    });
  }
};

// Exportamos los métodos para usarlos en el controlador
module.exports = {
  getPublicBanner,
  getPublicTarjetas,
  getPublicTarjetaById
};
