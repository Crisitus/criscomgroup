// codigo_barras.controller.js
const { Op } = require('sequelize');
const { Producto, CodigoBarras, Categoria } = require('../models');

// Mismas reglas de acceso que producto.controller: cada negocio solo toca su propio inventario
const puedeVer = (req, producto) => {
  if (!producto) return false;
  if (req.user?.tipo_vendedor === 'afiliado') return Number(producto.affiliate_business_id) === Number(req.user.affiliate_business_id);
  return !producto.affiliate_business_id;
};
const productoAccesible = async (req, idProducto) => {
  const producto = await Producto.scope('allBusinesses').findByPk(idProducto);
  return puedeVer(req, producto) ? producto : null;
};
const noEncontrado = res => res.status(404).json({ message: 'Código de barras no encontrado' });

const codigoBarrasController = {
  // Agregar códigos de barras a un producto
  agregarCodigosBarras: async (req, res) => {
    try {
      const { id_producto } = req.params;
      const { codigos_barras } = req.body;
      if (!Array.isArray(codigos_barras) || codigos_barras.length === 0) {
        return res.status(400).json({ message: 'Envía al menos un código de barras' });
      }

      // Verificar que el producto existe
      const producto = await productoAccesible(req, id_producto);
      if (!producto) {
        return res.status(404).json({ message: 'Producto no encontrado' });
      }

      // Normalizar los datos de entrada para tener un formato uniforme
      const codigosNormalizados = codigos_barras.map(item => {
        if (typeof item === 'object' && item.codigo) {
          return {
            codigo: item.codigo,
            cantidad: item.cantidad || 1
          };
        }
        return {
          codigo: item,
          cantidad: 1
        };
      });
      
      // Agrupar los códigos y sumar sus cantidades para evitar procesarlos múltiples veces
      const codigosAgrupados = {};
      codigosNormalizados.forEach(item => {
        if (codigosAgrupados[item.codigo]) {
          codigosAgrupados[item.codigo] += item.cantidad;
        } else {
          codigosAgrupados[item.codigo] = item.cantidad;
        }
      });
      
      // Convertir el objeto agrupado de vuelta a un array
      const codigosUnicos = Object.keys(codigosAgrupados).map(codigo => ({
        codigo,
        cantidad: codigosAgrupados[codigo]
      }));
      
      const codigosList = codigosUnicos.map(item => item.codigo);
      if (codigosUnicos.some(item => !String(item.codigo || '').trim() || !Number.isInteger(Number(item.cantidad)) || Number(item.cantidad) < 1)) {
        return res.status(400).json({ message: 'Cada código necesita un valor y una cantidad entera mayor que cero' });
      }
      const enOtroProducto = await CodigoBarras.findOne({ where: { codigo_barras: codigosList, id_producto: { [Op.ne]: producto.id_producto } } });
      if (enOtroProducto) {
        return res.status(409).json({ message: `El código ${enOtroProducto.codigo_barras} ya pertenece a otro producto` });
      }
      
      // Verificar qué códigos ya existen
      const codigosExistentes = await CodigoBarras.findAll({
        where: { 
          codigo_barras: codigosList,
          id_producto: producto.id_producto
        }
      });

      const codigosExistentesMap = {};
      codigosExistentes.forEach(codigo => {
        codigosExistentesMap[codigo.codigo_barras] = codigo;
      });

      const resultadosActualizados = [];
      const codigosNuevos = [];

      // Procesar cada código único
      for (const item of codigosUnicos) {
        if (codigosExistentesMap[item.codigo]) {
          // Actualizar la cantidad del código existente
          const codigoExistente = codigosExistentesMap[item.codigo];
          const cantidadAnterior = codigoExistente.cantidad;
          const nuevaCantidad = cantidadAnterior + item.cantidad;
          
          await codigoExistente.update({ cantidad: nuevaCantidad });
          resultadosActualizados.push({
            codigo_barras: codigoExistente.codigo_barras,
            cantidad_anterior: cantidadAnterior,
            cantidad_nueva: nuevaCantidad,
            incremento: item.cantidad
          });
        } else {
          // Crear nuevo código de barras
          codigosNuevos.push({
            codigo_barras: item.codigo,
            cantidad: item.cantidad,
            id_producto: producto.id_producto
          });
        }
      }

      // Crear los nuevos códigos de barras en batch
      let nuevosCodigosBarras = [];
      if (codigosNuevos.length > 0) {
        nuevosCodigosBarras = await CodigoBarras.bulkCreate(codigosNuevos);
      }

      return res.status(200).json({
        message: 'Códigos de barras procesados exitosamente',
        codigos_actualizados: resultadosActualizados,
        codigos_nuevos: nuevosCodigosBarras,
        stock_actual: producto.stock
      });
    } catch (error) {
      console.error('Error al procesar códigos de barras:', error);
      return res.status(500).json({ 
        message: 'Error al procesar códigos de barras',
        error: error.message 
      });
    }
  },

  // Obtener códigos de barras de un producto
  obtenerCodigosBarras: async (req, res) => {
    try {
      const { id_producto } = req.params;

      const whereCondition = { id_producto };

      // Primero obtenemos el producto
      const producto = await productoAccesible(req, id_producto);
      
      if (!producto) {
        return res.status(404).json({ message: 'Producto no encontrado' });
      }
      
      // Luego obtenemos los códigos de barras asociados
      const codigos = await CodigoBarras.findAll({
        where: whereCondition
      });

      // Formateamos cada código de barras para destacar la cantidad
      const codigosFormateados = codigos.map(codigo => {
        return {
          id: codigo.id_codigo_barras,
          codigo: codigo.codigo_barras,
          cantidad: codigo.cantidad, // Destacamos la cantidad
          fecha_ingreso: codigo.fecha_ingreso
        };
      });

      // Sumamos el total de unidades disponibles entre todos los códigos
      const totalUnidades = codigos.reduce((sum, codigo) => sum + codigo.cantidad, 0);

      // Formateamos la respuesta como deseas
      return res.status(200).json({
        producto: {
          id_producto: producto.id_producto,
          nombre: producto.nombre,
          sku: producto.sku,
          stock: producto.stock
        },
        resumen: {
          total_codigos_barras: codigos.length,
          total_unidades: totalUnidades
        },
        codigos_barras: codigosFormateados
      });
    } catch (error) {
      console.error('Error al obtener códigos de barras:', error);
      return res.status(500).json({ 
        message: 'Error al obtener códigos de barras',
        error: error.message 
      });
    }
  },

  // Función para buscar un producto por código de barras
  buscarProductoPorCodigoBarras: async (req, res) => {
    try {
      const { codigo } = req.params; // Obtiene el código de barras de los parámetros de la URL
      
      // Buscar el código de barras en la base de datos
      const codigoBarras = await CodigoBarras.findOne({
        where: { codigo_barras: codigo },
        include: [{
          model: Producto.scope('allBusinesses'),
          as: 'producto',
          include: [{
            model: Categoria,
            as: 'categoria',
            attributes: ['id_categoria', 'nombre']
          }]
        }]
      });
      
      // Si no se encuentra el código de barras (o es de otro negocio)
      if (!codigoBarras || !puedeVer(req, codigoBarras.producto)) {
        return res.status(404).json({ 
          message: 'Código de barras no encontrado' 
        });
      }
      
      // Responder con el código de barras y el producto asociado
      return res.status(200).json({
        codigo_barras: {
          id: codigoBarras.id_codigo_barras,
          codigo: codigoBarras.codigo_barras,
          cantidad: codigoBarras.cantidad,
          fecha_ingreso: codigoBarras.fecha_ingreso
        },
        producto: codigoBarras.producto
      });
      
    } catch (error) {
      console.error('Error al buscar producto por código de barras:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Error al buscar producto por código de barras',
        error: error.message 
      });
    }
  },

  // Actualizar cantidad de un código de barras
  actualizarCantidad: async (req, res) => {
    try {
      const { codigo } = req.params;
      const { cantidad } = req.body;

      // Verificar que la cantidad sea un número positivo
      if (!Number.isInteger(Number(cantidad)) || Number(cantidad) < 1) {
        return res.status(400).json({ 
          message: 'La cantidad debe ser un entero mayor que cero. Para dejarla en 0, elimina el código.' 
        });
      }

      // Buscar el código de barras
      const codigoBarras = await CodigoBarras.findOne({
        where: { codigo_barras: codigo }
      });
      
      if (!codigoBarras || !(await productoAccesible(req, codigoBarras.id_producto))) {
        return res.status(404).json({ 
          message: 'Código de barras no encontrado' 
        });
      }

      // Actualizar la cantidad
      codigoBarras.cantidad = parseInt(cantidad);
      await codigoBarras.save();

      return res.status(200).json({
        message: 'Cantidad actualizada exitosamente',
        codigo_barras: codigoBarras
      });
    } catch (error) {
      console.error('Error al actualizar cantidad:', error);
      return res.status(500).json({ 
        message: 'Error al actualizar cantidad del código de barras',
        error: error.message 
      });
    }
  },

  // Actualizar cantidades de múltiples códigos de barras
  actualizarMultiplesCantidades: async (req, res) => {
    try {
      const { codigos } = req.body;

      // Verificar que se proporcionó un array de códigos
      if (!Array.isArray(codigos) || codigos.length === 0) {
        return res.status(400).json({
          message: 'Se debe proporcionar un array de códigos de barras con sus cantidades'
        });
      }

      // Extraer los códigos para buscarlos
      const codigosList = codigos.map(item => item.codigo);

      // Buscar todos los códigos de barras en una sola consulta
      const codigosBarras = await CodigoBarras.findAll({
        where: { 
          codigo_barras: codigosList 
        },
        include: [{
          model: Producto.scope('allBusinesses'),
          as: 'producto',
          attributes: ['id_producto', 'nombre', 'affiliate_business_id']
        }]
      });

      // Crear un mapa para acceder rápidamente a los códigos encontrados
      const codigosMap = {};
      codigosBarras.filter(codigo => puedeVer(req, codigo.producto)).forEach(codigo => {
        codigosMap[codigo.codigo_barras] = codigo;
      });

      const resultados = {
        actualizados: [],
        no_encontrados: []
      };

      // Actualizar cada código proporcionado
      for (const item of codigos) {
        if (!item.codigo || isNaN(parseInt(item.cantidad)) || parseInt(item.cantidad) < 0) {
          resultados.no_encontrados.push({
            codigo: item.codigo,
            motivo: 'Formato inválido o cantidad negativa'
          });
          continue;
        }

        const codigoBarras = codigosMap[item.codigo];
        
        if (codigoBarras) {
          const cantidadAnterior = codigoBarras.cantidad;
          codigoBarras.cantidad = parseInt(item.cantidad);
          await codigoBarras.save();
          
          resultados.actualizados.push({
            codigo: item.codigo,
            cantidad_anterior: cantidadAnterior,
            cantidad_nueva: codigoBarras.cantidad,
            producto: codigoBarras.producto ? {
              id: codigoBarras.producto.id_producto,
              nombre: codigoBarras.producto.nombre
            } : null
          });
        } else {
          resultados.no_encontrados.push({
            codigo: item.codigo,
            motivo: 'Código de barras no encontrado'
          });
        }
      }

      return res.status(200).json({
        message: 'Actualización de cantidades procesada',
        resultados
      });
    } catch (error) {
      console.error('Error al actualizar múltiples cantidades:', error);
      return res.status(500).json({
        message: 'Error al actualizar cantidades de códigos de barras',
        error: error.message
      });
    }
  },

  // Eliminar código de barras
  eliminarCodigoBarras: async (req, res) => {
    try {
      const { codigo } = req.params;

      // Buscar el código de barras
      const codigoBarras = await CodigoBarras.findOne({
        where: { codigo_barras: codigo },
        include: [{
          model: Producto.scope('allBusinesses'),
          as: 'producto',
          attributes: ['id_producto', 'nombre', 'affiliate_business_id']
        }]
      });
      
      if (!codigoBarras || !puedeVer(req, codigoBarras.producto)) {
        return res.status(404).json({ 
          message: 'Código de barras no encontrado' 
        });
      }

      // Guardar información antes de eliminar
      const codigoInfo = {
        codigo: codigoBarras.codigo_barras,
        cantidad: codigoBarras.cantidad,
        producto: codigoBarras.producto ? {
          id: codigoBarras.producto.id_producto,
          nombre: codigoBarras.producto.nombre
        } : null
      };

      // Eliminar el código de barras
      await codigoBarras.destroy();

      return res.status(200).json({
        message: 'Código de barras eliminado exitosamente',
        codigo_eliminado: codigoInfo
      });
    } catch (error) {
      console.error('Error al eliminar código de barras:', error);
      return res.status(500).json({ 
        message: 'Error al eliminar código de barras',
        error: error.message 
      });
    }  },

  // Función para eliminar código de barras por ID
  eliminarCodigoBarrasPorId: async (req, res) => {
    try {
      const { id } = req.params;

      // Buscar el código de barras por ID
      const codigoBarras = await CodigoBarras.findByPk(id, {
        include: [{
          model: Producto.scope('allBusinesses'),
          as: 'producto',
          attributes: ['id_producto', 'nombre', 'affiliate_business_id']
        }]
      });
      
      if (!codigoBarras || !puedeVer(req, codigoBarras.producto)) {
        return res.status(404).json({ 
          message: 'Código de barras no encontrado' 
        });
      }

      // Guardar información antes de eliminar
      const codigoInfo = {
        id: codigoBarras.id_codigo_barras,
        codigo: codigoBarras.codigo_barras,
        cantidad: codigoBarras.cantidad,
        producto: codigoBarras.producto ? {
          id: codigoBarras.producto.id_producto,
          nombre: codigoBarras.producto.nombre
        } : null
      };

      // Eliminar el código de barras
      await codigoBarras.destroy();

      return res.status(200).json({
        message: 'Código de barras eliminado exitosamente',
        codigo_eliminado: codigoInfo
      });
    } catch (error) {
      console.error('Error al eliminar código de barras por ID:', error);
      return res.status(500).json({ 
        message: 'Error al eliminar código de barras',
        error: error.message 
      });
    }
  }
};

module.exports = codigoBarrasController;