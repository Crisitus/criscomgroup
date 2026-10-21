const fs = require('fs');
const path = require('path');
const { Op, fn, col, where: sqlWhere } = require('sequelize');
const { Categoria, Producto } = require('../models');

// Nombre unico sin distinguir mayusculas ni espacios extremos
const nombreDuplicado = async (nombre, exceptId) => Categoria.findOne({
  where: {
    [Op.and]: [
      sqlWhere(fn('LOWER', fn('TRIM', col('nombre'))), String(nombre).trim().toLowerCase()),
      ...(exceptId ? [{ id_categoria: { [Op.ne]: exceptId } }] : []),
    ],
  },
});
const productosDelNegocio = req => req.user?.tipo_vendedor === 'afiliado'
  ? { model: Producto.scope('allBusinesses'), as: 'productos', required: false, where: { affiliate_business_id: req.user.affiliate_business_id } }
  : { model: Producto, as: 'productos', required: false };

// Función helper para generar URLs completas de imágenes
const generarUrlCompleta = (imagen_url, req) => {
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
  
  // Si es solo el nombre del archivo o una ruta relativa, agregarlo a la ruta uploads/categorias
  const filename = imagen_url.split(/[\\\/]/).pop() || imagen_url;
  return `${baseUrl}/uploads/categorias/${filename}`;
};

const categoriaController = {
  // Crear una nueva categoría
  create: async (req, res) => {
    try {
      const { nombre, descripcion } = req.body;
      
      if (!nombre || !String(nombre).trim()) {
        return res.status(400).json({ message: 'El nombre de la categoría es obligatorio' });
      }
      if (await nombreDuplicado(nombre)) {
        return res.status(409).json({ message: `Ya existe una categoría llamada «${String(nombre).trim()}»` });
      }
      
      // Procesar imagen si se subió
      let imagen_url = null;
      if (req.file) {
        // Guardar solo la ruta relativa desde /uploads
        imagen_url = req.file.path.replace(/.*\/uploads/, '/uploads');
      }
      
      const categoria = await Categoria.create({
        nombre: String(nombre).trim(),
        descripcion,
        imagen_url,
      });
      
      return res.status(201).json({
        message: 'Categoría creada exitosamente',
        categoria
      });
    } catch (error) {
      console.error('Error al crear la categoría:', error);
      return res.status(500).json({ 
        message: 'Error al crear la categoría',
        error: error.message 
      });
    }
  },
  
  // Obtener todas las categorías
  getAll: async (req, res) => {
    try {
      const categorias = await Categoria.findAll({
        order: [['nombre', 'ASC']]
      });
      const negocio = req.user?.tipo_vendedor === 'afiliado' ? Number(req.user.affiliate_business_id) : null;
      const conteos = await Producto.scope('allBusinesses').findAll({
        attributes: ['id_categoria', [fn('COUNT', col('id_producto')), 'total'], [fn('SUM', col('stock')), 'unidades']],
        where: { affiliate_business_id: negocio },
        group: ['id_categoria'],
        raw: true,
      });
      const porCategoria = Object.fromEntries(conteos.map(c => [Number(c.id_categoria), c]));
      
      // Generar URLs completas para las imágenes de cada categoría
      const categoriasConImagenes = categorias.map(categoria => {
        const categoriaData = categoria.toJSON();
        const conteo = porCategoria[categoriaData.id_categoria];
        categoriaData.total_productos = Number(conteo?.total || 0);
        categoriaData.total_unidades = Number(conteo?.unidades || 0);
        if (categoriaData.imagen_url) {
          categoriaData.imagen_url = generarUrlCompleta(categoriaData.imagen_url, req);
        }
        return categoriaData;
      });
      
      return res.status(200).json(categoriasConImagenes);
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      return res.status(500).json({ 
        message: 'Error al obtener categorías',
        error: error.message 
      });
    }
  },
  
  // Obtener una categoría por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const categoria = await Categoria.findByPk(id, {
        include: productosDelNegocio(req)
      });
      
      if (!categoria) {
        return res.status(404).json({ message: 'Categoría no encontrada' });
      }
      
      // Generar URL completa para la imagen
      const categoriaData = categoria.toJSON();
      if (categoriaData.imagen_url) {
        categoriaData.imagen_url = generarUrlCompleta(categoriaData.imagen_url, req);
      }
      
      // Generar URL completa para las imágenes de los productos también
      if (categoriaData.productos && categoriaData.productos.length > 0) {
        categoriaData.productos = categoriaData.productos.map(producto => {
          if (producto.imagen_url) {
            producto.imagen_url = generarUrlCompleta(producto.imagen_url, req);
          }
          return producto;
        });
      }
      
      return res.status(200).json(categoriaData);
    } catch (error) {
      console.error('Error al obtener la categoría:', error);
      return res.status(500).json({ 
        message: 'Error al obtener la categoría',
        error: error.message 
      });
    }
  },
  
  
  
  // Actualizar una categoría
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, descripcion } = req.body;
      
      const categoria = await Categoria.findByPk(id);
      
      if (!categoria) {
        return res.status(404).json({ message: 'Categoría no encontrada' });
      }
      
      // Actualizar los campos
      if (nombre !== undefined) {
        if (!String(nombre).trim()) return res.status(400).json({ message: 'El nombre de la categoría es obligatorio' });
        if (await nombreDuplicado(nombre, categoria.id_categoria)) {
          return res.status(409).json({ message: `Ya existe una categoría llamada «${String(nombre).trim()}»` });
        }
        categoria.nombre = String(nombre).trim();
      }
      if (descripcion !== undefined) categoria.descripcion = descripcion;
      
      // Procesar imagen si se subió una nueva
      if (req.file) {
        // Si ya existe una imagen, eliminarla primero
        if (categoria.imagen_url) {
          try {
            const imagePath = path.join(__dirname, '../../src', categoria.imagen_url);
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);

            }
          } catch (error) {
            console.error('Error al eliminar imagen anterior de categoría:', error);
            // Continuar con la actualización aunque falle la eliminación del archivo
          }
        }
        
        // Guardar la nueva imagen
        categoria.imagen_url = req.file.path.replace(/.*\/uploads/, '/uploads');
      }
      
      await categoria.save();
      
      // Generar URL completa para la imagen en la respuesta
      const categoriaData = categoria.toJSON();
      if (categoriaData.imagen_url) {
        categoriaData.imagen_url = generarUrlCompleta(categoriaData.imagen_url, req);
      }
      
      return res.status(200).json({
        message: 'Categoría actualizada exitosamente',
        categoria: categoriaData
      });
    } catch (error) {
      console.error('Error al actualizar la categoría:', error);
      return res.status(500).json({ 
        message: 'Error al actualizar la categoría',
        error: error.message 
      });
    }
  },
  
  // Eliminar una categoría
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      
      const categoria = await Categoria.findByPk(id);
      
      if (!categoria) {
        return res.status(404).json({ message: 'Categoría no encontrada' });
      }
      
      // Los productos exigen categoria: no se borra una categoria en uso (de ningun negocio)
      const enUso = await Producto.scope('allBusinesses').count({ where: { id_categoria: categoria.id_categoria } });
      if (enUso > 0) {
        return res.status(409).json({ message: `La categoría tiene ${enUso} producto${enUso === 1 ? '' : 's'}. Muévelos a otra categoría antes de eliminarla.`, productos: enUso });
      }

      // Si la categoría tiene una imagen, eliminarla del sistema de archivos
      if (categoria.imagen_url) {
        try {
          const imagePath = path.join(__dirname, '../../src', categoria.imagen_url);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);

          }
        } catch (error) {
          console.error('Error al eliminar imagen de la categoría:', error);
          // No fallar la eliminación de la categoría si hay error al eliminar la imagen
        }
      }
      
      await categoria.destroy();
      
      return res.status(200).json({
        message: 'Categoría eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar la categoría:', error);
      return res.status(500).json({ 
        message: 'Error al eliminar la categoría',
        error: error.message 
      });
    }
  },
  
  // Eliminar imagen de una categoría
  deleteImage: async (req, res) => {
    try {
      const { id } = req.params;
      
      const categoria = await Categoria.findByPk(id);
      
      if (!categoria) {
        return res.status(404).json({ message: 'Categoría no encontrada' });
      }
      
      if (!categoria.imagen_url) {
        return res.status(400).json({ message: 'La categoría no tiene imagen para eliminar' });
      }
      
      // Eliminar la imagen del sistema de archivos
      try {
        // Construir la ruta completa del archivo
        const imagePath = path.join(__dirname, '../../src', categoria.imagen_url);
        
        // Verificar si el archivo existe y eliminarlo
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);

        }
      } catch (error) {
        console.error('Error al eliminar archivo de imagen:', error);
        // Continuar para actualizar la base de datos aunque falle la eliminación del archivo
      }
      
      // Actualizar la categoría para remover la referencia a la imagen
      categoria.imagen_url = null;
      await categoria.save();
      
      return res.status(200).json({
        message: 'Imagen de la categoría eliminada exitosamente',
        categoria,
      });
    } catch (error) {
      console.error('Error al eliminar imagen de la categoría:', error);
      return res.status(500).json({ 
        message: 'Error al eliminar imagen de la categoría',
        error: error.message 
      });
    }
  },
};

module.exports = categoriaController;