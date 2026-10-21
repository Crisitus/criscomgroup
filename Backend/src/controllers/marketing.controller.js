const fs = require('fs');
const path = require('path');
const { Banner, Tarjeta } = require('../models');

// Función helper para generar URLs completas de imágenes
const generarUrlCompleta = (imagen_url, req, tipo) => {
  if (!imagen_url) return null;
  
  // Si ya es una URL completa (http/https), devolverla tal como está
  if (imagen_url.startsWith('http')) {
    return imagen_url;
  }
  
  // Obtener el protocolo y host, manejando proxies y configuraciones del servidor
  const protocol = req.get('X-Forwarded-Proto') || req.protocol || 'https';
  let host = req.get('X-Forwarded-Host') || req.get('Host') || req.get('host');
  
  // Limpiar el host para evitar duplicaciones y problemas con proxies
  if (host && host.includes(',')) {
    host = host.split(',')[0].trim();
  }
  
  // Construir la URL base usando PUBLIC_BASE_URL si está configurado
  const baseUrl = process.env.PUBLIC_BASE_URL || `${protocol}://${host}`;
  
  // Si imagen_url ya incluye '/uploads/', usar tal como está
  if (imagen_url.startsWith('/uploads/')) {
    return `${baseUrl}${imagen_url}`;
  }
  
  // Si es solo el nombre del archivo o una ruta relativa, agregarlo a la ruta adecuada
  const filename = imagen_url.split(/[\\\/]/).pop() || imagen_url;
  return `${baseUrl}/uploads/${tipo}/${filename}`;
};

const marketingController = {
  // ========== MÉTODOS PARA BANNER ==========
  
  // Obtener el banner
  getBanner: async (req, res) => {
    try {
      const banner = await Banner.findOne({
        order: [['creado_en', 'DESC']]
      });
      
      if (!banner) {
        return res.status(404).json({ message: 'No hay banner disponible' });
      }
      
      // Generar URL completa para la imagen
      const bannerData = banner.toJSON();
      if (bannerData.imagen_url) {
        bannerData.imagen_url = generarUrlCompleta(bannerData.imagen_url, req, 'banner');
      }
      
      return res.status(200).json(bannerData);
    } catch (error) {
      console.error('Error al obtener el banner:', error);
      return res.status(500).json({ 
        message: 'Error al obtener el banner',
        error: error.message 
      });
    }
  },
  
  // Crear o actualizar el banner
  updateBanner: async (req, res) => {
    try {
      const { whatsapp } = req.body;
      
      // Procesar imagen si se subió
      if (!req.file) {
        return res.status(400).json({ message: 'Debe subir una imagen para el banner' });
      }
      
      // Guardar solo la ruta relativa desde /uploads
      const imagen_url = req.file.path.replace(/.*\/uploads/, '/uploads');
      
      // Buscar si ya existe un banner
      const bannerExistente = await Banner.findOne({
        order: [['creado_en', 'DESC']]
      });
      
      let banner;
      
      // Si existe, actualizarlo
      if (bannerExistente) {
        // Si ya tiene una imagen, eliminarla
        if (bannerExistente.imagen_url) {
          try {
            const imagePath = path.join(__dirname, '../../src', bannerExistente.imagen_url);
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);

            }
          } catch (error) {
            console.error('Error al eliminar imagen anterior del banner:', error);
            // Continuar con la actualización aunque falle la eliminación del archivo
          }
        }
        
        // Actualizar el banner existente
        bannerExistente.imagen_url = imagen_url;
        if (whatsapp !== undefined) {
          bannerExistente.whatsapp = whatsapp;
        }
        await bannerExistente.save();
        banner = bannerExistente;
      } else {
        // Crear un nuevo banner
        banner = await Banner.create({
          imagen_url,
          whatsapp: whatsapp || null
        });
      }
      
      // Generar URL completa para la imagen en la respuesta
      const bannerData = banner.toJSON();
      if (bannerData.imagen_url) {
        bannerData.imagen_url = generarUrlCompleta(bannerData.imagen_url, req, 'banner');
      }
      
      return res.status(200).json({
        message: 'Banner actualizado exitosamente',
        banner: bannerData
      });
    } catch (error) {
      console.error('Error al actualizar el banner:', error);
      return res.status(500).json({ 
        message: 'Error al actualizar el banner',
        error: error.message 
      });
    }
  },
  
  // Actualizar solo el WhatsApp del banner
  updateBannerWhatsapp: async (req, res) => {
    try {
      const { whatsapp } = req.body;
      
      // Buscar si ya existe un banner
      const banner = await Banner.findOne({
        order: [['creado_en', 'DESC']]
      });
      
      if (!banner) {
        return res.status(404).json({ message: 'No hay banner disponible' });
      }
      
      // Actualizar solo el WhatsApp
      banner.whatsapp = whatsapp || null;
      await banner.save();
      
      // Generar URL completa para la imagen en la respuesta
      const bannerData = banner.toJSON();
      if (bannerData.imagen_url) {
        bannerData.imagen_url = generarUrlCompleta(bannerData.imagen_url, req, 'banner');
      }
      
      return res.status(200).json({
        message: 'WhatsApp del banner actualizado exitosamente',
        banner: bannerData
      });
    } catch (error) {
      console.error('Error al actualizar WhatsApp del banner:', error);
      return res.status(500).json({ 
        message: 'Error al actualizar WhatsApp del banner',
        error: error.message 
      });
    }
  },
  
  // Eliminar imagen del banner
  deleteBannerImage: async (req, res) => {
    try {
      const banner = await Banner.findOne({
        order: [['creado_en', 'DESC']]
      });
      
      if (!banner) {
        return res.status(404).json({ message: 'No hay banner disponible' });
      }
      
      if (!banner.imagen_url) {
        return res.status(400).json({ message: 'El banner no tiene imagen para eliminar' });
      }
      
      // Eliminar la imagen del sistema de archivos
      try {
        // Construir la ruta completa del archivo
        const imagePath = path.join(__dirname, '../../src', banner.imagen_url);
        
        // Verificar si el archivo existe y eliminarlo
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);

        }
      } catch (error) {
        console.error('Error al eliminar archivo de imagen del banner:', error);
        // Continuar para actualizar la base de datos aunque falle la eliminación del archivo
      }
      
      // Actualizar el banner para remover la referencia a la imagen
      banner.imagen_url = null;
      await banner.save();
      
      return res.status(200).json({
        message: 'Imagen del banner eliminada exitosamente',
        banner,
      });
    } catch (error) {
      console.error('Error al eliminar imagen del banner:', error);
      return res.status(500).json({ 
        message: 'Error al eliminar imagen del banner',
        error: error.message 
      });
    }
  },
  
  // Eliminar solo el WhatsApp del banner
  deleteBannerWhatsapp: async (req, res) => {
    try {
      // Buscar si ya existe un banner
      const banner = await Banner.findOne({
        order: [['creado_en', 'DESC']]
      });
      
      if (!banner) {
        return res.status(404).json({ message: 'No hay banner disponible' });
      }
      
      // Eliminar solo el WhatsApp (establecer como null)
      banner.whatsapp = null;
      await banner.save();
      
      // Generar URL completa para la imagen en la respuesta
      const bannerData = banner.toJSON();
      if (bannerData.imagen_url) {
        bannerData.imagen_url = generarUrlCompleta(bannerData.imagen_url, req, 'banner');
      }
      
      return res.status(200).json({
        message: 'WhatsApp del banner eliminado exitosamente',
        banner: bannerData
      });
    } catch (error) {
      console.error('Error al eliminar WhatsApp del banner:', error);
      return res.status(500).json({ 
        message: 'Error al eliminar WhatsApp del banner',
        error: error.message 
      });
    }
  },

  // ========== MÉTODOS PARA TARJETAS ==========
  
  // Obtener todas las tarjetas
  getAllTarjetas: async (req, res) => {
    try {
      const tarjetas = await Tarjeta.findAll({
        order: [['creado_en', 'DESC']]
      });
      
      // Generar URLs completas para las imágenes de cada tarjeta
      const tarjetasConImagenes = tarjetas.map(tarjeta => {
        const tarjetaData = tarjeta.toJSON();
        if (tarjetaData.imagen_url) {
          tarjetaData.imagen_url = generarUrlCompleta(tarjetaData.imagen_url, req, 'tarjetas');
        }
        return tarjetaData;
      });
      
      return res.status(200).json(tarjetasConImagenes);
    } catch (error) {
      console.error('Error al obtener tarjetas:', error);
      return res.status(500).json({ 
        message: 'Error al obtener tarjetas',
        error: error.message 
      });
    }
  },
  
  // Obtener una tarjeta por ID
  getTarjetaById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const tarjeta = await Tarjeta.findByPk(id);
      
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
      console.error('Error al obtener la tarjeta:', error);
      return res.status(500).json({ 
        message: 'Error al obtener la tarjeta',
        error: error.message 
      });
    }
  },
  
  // Crear una nueva tarjeta
  createTarjeta: async (req, res) => {
    try {
      const { titulo, descripcion } = req.body;
      
      if (!titulo) {
        return res.status(400).json({ message: 'El título de la tarjeta es obligatorio' });
      }
      
      // Procesar imagen si se subió
      let imagen_url = null;
      if (req.file) {
        // Guardar solo la ruta relativa desde /uploads
        imagen_url = req.file.path.replace(/.*\/uploads/, '/uploads');
      }
      
      const tarjeta = await Tarjeta.create({
        titulo,
        descripcion,
        imagen_url
      });
      
      return res.status(201).json({
        message: 'Tarjeta creada exitosamente',
        tarjeta
      });
    } catch (error) {
      console.error('Error al crear la tarjeta:', error);
      return res.status(500).json({ 
        message: 'Error al crear la tarjeta',
        error: error.message 
      });
    }
  },
  
  // Actualizar una tarjeta
  updateTarjeta: async (req, res) => {
    try {
      const { id } = req.params;
      const { titulo, descripcion } = req.body;
      
      const tarjeta = await Tarjeta.findByPk(id);
      
      if (!tarjeta) {
        return res.status(404).json({ message: 'Tarjeta no encontrada' });
      }
      
      // Actualizar los campos
      if (titulo !== undefined) tarjeta.titulo = titulo;
      if (descripcion !== undefined) tarjeta.descripcion = descripcion;
      
      // Procesar imagen si se subió una nueva
      if (req.file) {
        // Si ya existe una imagen, eliminarla primero
        if (tarjeta.imagen_url) {
          try {
            const imagePath = path.join(__dirname, '../../src', tarjeta.imagen_url);
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);

            }
          } catch (error) {
            console.error('Error al eliminar imagen anterior de tarjeta:', error);
            // Continuar con la actualización aunque falle la eliminación del archivo
          }
        }
        
        // Guardar la nueva imagen
        tarjeta.imagen_url = req.file.path.replace(/.*\/uploads/, '/uploads');
      }
      
      await tarjeta.save();
      
      // Generar URL completa para la imagen en la respuesta
      const tarjetaData = tarjeta.toJSON();
      if (tarjetaData.imagen_url) {
        tarjetaData.imagen_url = generarUrlCompleta(tarjetaData.imagen_url, req, 'tarjetas');
      }
      
      return res.status(200).json({
        message: 'Tarjeta actualizada exitosamente',
        tarjeta: tarjetaData
      });
    } catch (error) {
      console.error('Error al actualizar la tarjeta:', error);
      return res.status(500).json({ 
        message: 'Error al actualizar la tarjeta',
        error: error.message 
      });
    }
  },
  
  // Eliminar imagen de una tarjeta
  deleteTarjetaImage: async (req, res) => {
    try {
      const { id } = req.params;
      
      const tarjeta = await Tarjeta.findByPk(id);
      
      if (!tarjeta) {
        return res.status(404).json({ message: 'Tarjeta no encontrada' });
      }
      
      if (!tarjeta.imagen_url) {
        return res.status(400).json({ message: 'La tarjeta no tiene imagen para eliminar' });
      }
      
      // Eliminar la imagen del sistema de archivos
      try {
        // Construir la ruta completa del archivo
        const imagePath = path.join(__dirname, '../../src', tarjeta.imagen_url);
        
        // Verificar si el archivo existe y eliminarlo
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);

        }
      } catch (error) {
        console.error('Error al eliminar archivo de imagen:', error);
        // Continuar para actualizar la base de datos aunque falle la eliminación del archivo
      }
      
      // Actualizar la tarjeta para remover la referencia a la imagen
      tarjeta.imagen_url = null;
      await tarjeta.save();
      
      return res.status(200).json({
        message: 'Imagen de la tarjeta eliminada exitosamente',
        tarjeta,
      });
    } catch (error) {
      console.error('Error al eliminar imagen de la tarjeta:', error);
      return res.status(500).json({ 
        message: 'Error al eliminar imagen de la tarjeta',
        error: error.message 
      });
    }
  },
  
  // Eliminar una tarjeta
  deleteTarjeta: async (req, res) => {
    try {
      const { id } = req.params;
      
      const tarjeta = await Tarjeta.findByPk(id);
      
      if (!tarjeta) {
        return res.status(404).json({ message: 'Tarjeta no encontrada' });
      }
      
      // Si la tarjeta tiene una imagen, eliminarla del sistema de archivos
      if (tarjeta.imagen_url) {
        try {
          const imagePath = path.join(__dirname, '../../src', tarjeta.imagen_url);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);

          }
        } catch (error) {
          console.error('Error al eliminar imagen de la tarjeta:', error);
          // No fallar la eliminación de la tarjeta si hay error al eliminar la imagen
        }
      }
      
      await tarjeta.destroy();
      
      return res.status(200).json({
        message: 'Tarjeta eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar la tarjeta:', error);
      return res.status(500).json({ 
        message: 'Error al eliminar la tarjeta',
        error: error.message 
      });
    }
  }
};

module.exports = marketingController;
