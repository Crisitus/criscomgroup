const { sequelize, Producto, Categoria, Oferta, CodigoBarras, MovimientoInventario, DetalleVenta, CompraDetalle } = require("../models");
const { aplicarOfertas, derivarDescuento } = require("../services/ofertas.service");
const { aplicarMovimiento } = require("../services/stock.service");
const fs = require('fs');
const path = require('path');
const IGV_RATE = 0.18;

// Costos: solo Gerente/Administrador/Auditor, superusuario temporal o quien tenga permiso de area
// de inventario/compras. El resto (p. ej. Vendedor) nunca los recibe en las lecturas de producto.
const AREAS_COSTOS = ['inventario', 'compras'];
const puedeVerCostos = (req) => {
  const u = req.user || {};
  return [1, 2, 5].includes(u.id_role) || Boolean(u.superusuario_temporal)
    || (Array.isArray(u.area_grants) && u.area_grants.some(a => AREAS_COSTOS.includes(a)));
};
const sinCostos = (req, data) => {
  if (!puedeVerCostos(req) && data) { delete data.costo_promedio; delete data.ultimo_costo; }
  return data;
};

const findAccessibleProduct = async (req, id, options = {}) => {
  const product = await Producto.scope('allBusinesses').findByPk(id, options);
  if (!product) return null;
  if (req.user?.tipo_vendedor === 'afiliado'
    && Number(product.affiliate_business_id) !== Number(req.user.affiliate_business_id)) return null;
  if (req.user?.id_role === 3 && req.user?.tipo_vendedor !== 'afiliado'
    && product.affiliate_business_id) return null;
  return product;
};

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
  
  // Si es solo el nombre del archivo o una ruta relativa, agregarlo a la ruta uploads/productos
  const filename = imagen_url.split(/[\\\/]/).pop() || imagen_url;
  return `${baseUrl}/uploads/productos/${filename}`;
};

const productoController = {
  // Crear un nuevo producto
  create: async (req, res) => {
    let transaction;
    try {
      const { sku, nombre, descripcion, precio_unitario, precio_unitario_con_igv, precio_mayoritario, precio_mayoritario_con_igv, stock, id_categoria, condicion = 'nuevo', origen = 'local', garantia_meses, estado_observaciones, propietario_id } = req.body

      // Validación básica
      if (!sku || !nombre || precio_unitario === undefined || precio_unitario_con_igv === undefined || id_categoria === undefined) {
        return res.status(400).json({
          message: "Faltan campos obligatorios: sku, nombre, precio_unitario, precio_unitario_con_igv y id_categoria son requeridos",
        })
      }

      // Validar precios y stock (S8)
      const precioUnitarioNum = parseFloat(precio_unitario);
      if (!Number.isFinite(precioUnitarioNum) || precioUnitarioNum <= 0) {
        return res.status(400).json({ message: "Precio inválido" });
      }
      const precioConIgvNum = parseFloat(precio_unitario_con_igv);
      if (!Number.isFinite(precioConIgvNum) || precioConIgvNum <= 0) {
        return res.status(400).json({ message: "Precio inválido" });
      }
      if (stock !== undefined && stock !== null && stock !== '') {
        const stockNum = Number(stock);
        if (!Number.isInteger(stockNum) || stockNum < 0) {
          return res.status(400).json({ message: "Stock inválido" });
        }
      }

      // Verificar que la categoría existe
      const categoriaExiste = await Categoria.findByPk(id_categoria)
      if (!categoriaExiste) {
        return res.status(404).json({ message: "La categoría especificada no existe" })
      }

      // Verificar que el SKU no esté duplicado
      const skuExistente = await Producto.scope('allBusinesses').findOne({ where: { sku } })
      if (skuExistente) {
        return res.status(409).json({ message: "Ya existe un producto con ese SKU" })
      }

      // Procesar imagen si se subió
      let imagen_url = null;
      if (req.file) {
        // Guardar solo la ruta relativa desde /uploads
        imagen_url = req.file.path.replace(/.*\/uploads/, '/uploads');
      }

      // Guardar los datos tal como vienen del frontend
      transaction = await sequelize.transaction();
      const producto = await Producto.create({
        sku,
        nombre,
        descripcion,
        precio_unitario: precio_unitario,
        precio_unitario_con_igv: precio_unitario_con_igv,
        condicion,
        origen,
        garantia_meses: garantia_meses ?? (condicion === 'segunda_mano' ? 3 : 12),
        estado_observaciones: estado_observaciones || null,
        precio_mayoritario: precio_mayoritario || null,
        precio_mayoritario_con_igv: precio_mayoritario_con_igv || null,
        stock: stock || 0,
        id_categoria,
        imagen_url,
        propietario_id: req.user.id_role === 3 ? req.user.id_user : (propietario_id ? Number(propietario_id) : null),
        affiliate_business_id: req.user.tipo_vendedor === 'afiliado' ? req.user.affiliate_business_id : null,
      }, { transaction })

      if (Number(producto.stock) > 0) {
        await MovimientoInventario.create({ producto_id: producto.id_producto, tipo: 'ajuste_entrada', cantidad: Number(producto.stock), stock_anterior: 0, stock_nuevo: Number(producto.stock), costo_unitario: Number(producto.costo_promedio || 0), referencia_tipo: 'alta_producto', referencia_id: producto.id_producto, motivo: 'Stock inicial al crear producto', usuario_id: req.user.id_user, affiliate_business_id: producto.affiliate_business_id || null }, { transaction });
      }
      await transaction.commit();

      return res.status(201).json({
        message: "Producto creado exitosamente",
        producto,
      })
    } catch (error) {
      if (transaction) await transaction.rollback().catch(() => {});
      console.error("Error al crear el producto:", error)
      return res.status(500).json({
        message: "Error al crear el producto",
        error: error.message,
      })
    }
  },

  // Obtener todos los productos
  getAll: async (req, res) => {
    try {
      const productModel = req.user.tipo_vendedor === 'afiliado' ? Producto.unscoped() : Producto;
      const productos = await productModel.findAll({
        where: req.user.tipo_vendedor === 'afiliado' ? { affiliate_business_id: req.user.affiliate_business_id } : undefined,
        include: [
          {
            model: Categoria,
            as: "categoria",
            attributes: ["nombre"],
          },
          {
            model: Oferta,
            as: "oferta",
            attributes: ["descuento"],
          },
          {
            model: CodigoBarras,
            as: "codigos_barras",
            attributes: ["codigo_barras", "cantidad"],
            required: false // LEFT JOIN para que incluya productos sin códigos
          },
        ],
        order: [["nombre", "ASC"], [{ model: CodigoBarras, as: "codigos_barras" }, "id_codigo_barras", "ASC"]],
      });

      const productosConOferta = productos.map(producto => {
        const productoData = sinCostos(req, producto.toJSON());
        // Generar URL completa para la imagen
        if (productoData.imagen_url) {
          productoData.imagen_url = generarUrlCompleta(productoData.imagen_url, req);
        }
        return productoData;
      });

      return res.status(200).json(productosConOferta);
    } catch (error) {
      console.error("Error al obtener productos:", error)
      return res.status(500).json({
        message: "Error al obtener productos",
        error: error.message,
      })
    }
  },

  // Obtener productos por categoría
  getByCategoria: async (req, res) => {
    try {
      const { id_categoria } = req.params

      // Verificar que la categoría existe
      const categoriaExiste = await Categoria.findByPk(id_categoria)
      if (!categoriaExiste) {
        return res.status(404).json({ message: "La categoría especificada no existe" })
      }

      const productModel = req.user.tipo_vendedor === 'afiliado' ? Producto.scope('allBusinesses') : Producto;
      const productos = await productModel.findAll({
        where: req.user.tipo_vendedor === 'afiliado' ? { id_categoria, affiliate_business_id: req.user.affiliate_business_id } : { id_categoria },
        include: [
          {
            model: Oferta,
            as: "oferta",
            attributes: ["descuento"],
          },
        ],
        order: [["nombre", "ASC"]],
      });

      const productosConOferta = productos.map(producto => {
        const productoData = sinCostos(req, producto.toJSON());
        // Generar URL completa para la imagen
        if (productoData.imagen_url) {
          productoData.imagen_url = generarUrlCompleta(productoData.imagen_url, req);
        }
        return productoData;
      });

      return res.status(200).json(productosConOferta)
    } catch (error) {
      console.error("Error al obtener productos por categoría:", error)
      return res.status(500).json({
        message: "Error al obtener productos por categoría",
        error: error.message,
      })
    }
  },

  // Obtener un producto por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params

      const producto = await findAccessibleProduct(req, id, {
        include: {
          model: Categoria,
          as: "categoria",
        },
      })

      if (!producto) {
        return res.status(404).json({ message: "Producto no encontrado" })
      }
      const productoData = sinCostos(req, producto.toJSON());
      // Generar URL completa para la imagen
      if (productoData.imagen_url) {
        productoData.imagen_url = generarUrlCompleta(productoData.imagen_url, req);
      }

      return res.status(200).json(productoData)
    } catch (error) {
      console.error("Error al obtener el producto:", error)
      return res.status(500).json({
        message: "Error al obtener el producto",
        error: error.message,
      })
    }
  },

  // Actualizar un producto
  update: async (req, res) => {
    try {
      const { id } = req.params
      const { sku, nombre, descripcion, precio_unitario, precio_unitario_con_igv, precio_mayoritario, precio_mayoritario_con_igv, stock, id_categoria, condicion, origen, garantia_meses, estado_observaciones, stock_minimo } = req.body

      const producto = await findAccessibleProduct(req, id)

      if (!producto) {
        return res.status(404).json({ message: "Producto no encontrado" })
      }

      const stockAnterior = Number(producto.stock)

      // Si se actualiza el SKU, verificar que no exista otro producto con ese SKU
      if (sku && sku !== producto.sku) {
        const skuExistente = await Producto.scope('allBusinesses').findOne({ where: { sku } })
        if (skuExistente) {
          return res.status(409).json({ message: "Ya existe un producto con ese SKU" })
        }
        producto.sku = sku
      }

      // Si se actualiza la categoría, verificar que existe
      if (id_categoria && id_categoria !== producto.id_categoria) {
        const categoriaExiste = await Categoria.findByPk(id_categoria)
        if (!categoriaExiste) {
          return res.status(404).json({ message: "La categoría especificada no existe" })
        }
        producto.id_categoria = id_categoria
      }

      // Validar precios y stock si se envían en el body (S8)
      if (precio_unitario !== undefined) {
        const precioNum = parseFloat(precio_unitario);
        if (!Number.isFinite(precioNum) || precioNum <= 0) {
          return res.status(400).json({ message: "Precio inválido" });
        }
      }
      if (precio_unitario_con_igv !== undefined) {
        const precioConIgvNum = parseFloat(precio_unitario_con_igv);
        if (!Number.isFinite(precioConIgvNum) || precioConIgvNum <= 0) {
          return res.status(400).json({ message: "Precio inválido" });
        }
      }
      if (stock_minimo !== undefined && stock_minimo !== '') {
        const minimo = Number(stock_minimo)
        if (!Number.isInteger(minimo) || minimo < 0) {
          return res.status(400).json({ message: "El stock mínimo debe ser un entero no negativo" })
        }
        producto.stock_minimo = minimo
      }
      if (stock !== undefined) {
        const stockNum = Number(stock);
        if (!Number.isInteger(stockNum) || stockNum < 0) {
          return res.status(400).json({ message: "Stock inválido" });
        }
      }

      // Procesar imagen si se subió una nueva
      if (req.file) {
        // Si el producto ya tiene una imagen, eliminar la anterior
        if (producto.imagen_url) {
          try {
            // Construir la ruta completa del archivo anterior
            const oldImagePath = path.join(__dirname, '../../src', producto.imagen_url);
            
            // Verificar si el archivo existe y eliminarlo
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);

            }
          } catch (error) {
            console.error('Error al eliminar imagen anterior:', error);
            // No fallar la actualización si hay error al eliminar la imagen anterior
          }
        }
        
        // Guardar solo la ruta relativa desde /uploads
        producto.imagen_url = req.file.path.replace(/.*\/uploads/, '/uploads');
      }

      // Actualizar los demás campos
      if (nombre !== undefined) producto.nombre = nombre
      if (descripcion !== undefined) producto.descripcion = descripcion
      if (precio_unitario !== undefined) producto.precio_unitario = precio_unitario
      if (precio_unitario_con_igv !== undefined) producto.precio_unitario_con_igv = precio_unitario_con_igv
      if (condicion !== undefined) producto.condicion = condicion
      if (origen !== undefined) producto.origen = origen
      if (garantia_meses !== undefined) producto.garantia_meses = garantia_meses
      if (estado_observaciones !== undefined) producto.estado_observaciones = estado_observaciones || null
      if (precio_mayoritario !== undefined) producto.precio_mayoritario = precio_mayoritario
      if (precio_mayoritario_con_igv !== undefined) producto.precio_mayoritario_con_igv = precio_mayoritario_con_igv
      // El stock ya no se asigna aqui: va por stock.service.js con lock, abajo

      // Una oferta vigente mantiene su descuento proporcional al nuevo precio
      if (producto.es_oferta && precio_unitario_con_igv !== undefined && producto.changed('precio_unitario_con_igv')) {
        const anterior = Number(producto.previous('precio_unitario_con_igv'))
        const ofertaAnterior = Number(producto.precio_oferta_con_igv)
        if (anterior > 0 && ofertaAnterior > 0) {
          const ofertaConIgv = Number((Number(precio_unitario_con_igv) * (ofertaAnterior / anterior)).toFixed(2))
          producto.precio_oferta_con_igv = ofertaConIgv
          producto.precio_oferta = Number((ofertaConIgv / (1 + IGV_RATE)).toFixed(2))
        }
      }

      await producto.save()

      // Mantener ofertas.descuento acorde a los nuevos precios
      if (producto.es_oferta) {
        const d = derivarDescuento(producto.precio_unitario_con_igv, producto.precio_oferta_con_igv)
        if (d !== null) await Oferta.upsert({ id_producto: producto.id_producto, descuento: d })
      }

      if (stock !== undefined && Number(stock) !== stockAnterior) {
        // Ajuste absoluto bajo lock: el delta se calcula sobre el valor real de la fila
        const t = await sequelize.transaction();
        try {
          const bloqueado = await Producto.scope('allBusinesses').findByPk(producto.id_producto, { attributes: ['id_producto', 'stock', 'costo_promedio'], transaction: t, lock: t.LOCK.UPDATE })
          const delta = Number(stock) - Number(bloqueado.stock)
          if (delta !== 0) {
            await aplicarMovimiento({ productoId: producto.id_producto, delta, tipo: delta > 0 ? 'ajuste_entrada' : 'ajuste_salida', referenciaTipo: 'edicion_producto', referenciaId: producto.id_producto, motivo: 'Ajuste desde ficha de producto', usuarioId: req.user.id_user, affiliateBusinessId: producto.affiliate_business_id || null, costoUnitario: bloqueado.costo_promedio, transaction: t })
          }
          await t.commit()
        } catch (error) {
          await t.rollback();
          throw error;
        }
        await producto.reload()
      }

      const productoData = sinCostos(req, producto.toJSON());
      // Generar URL completa para la imagen
      if (productoData.imagen_url) {
        productoData.imagen_url = generarUrlCompleta(productoData.imagen_url, req);
      }

      return res.status(200).json({
        message: "Producto actualizado exitosamente",
        producto: productoData,
      })
    } catch (error) {
      console.error("Error al actualizar el producto:", error)
      return res.status(500).json({
        message: "Error al actualizar el producto",
        error: error.message,
      })
    }
  },

  // Actualizar el stock de un producto (PATCH)
  updateStock: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params
      const { cantidad } = req.body

      if (cantidad === undefined) {
        await t.rollback();
        return res.status(400).json({ message: "La cantidad es requerida" })
      }
      const stockObjetivo = Number(cantidad)
      if (!Number.isInteger(stockObjetivo) || stockObjetivo < 0) {
        await t.rollback();
        return res.status(400).json({ message: "El stock debe ser un entero no negativo" })
      }

      // Lock de la fila: el ajuste absoluto se calcula sobre el valor real, no sobre una lectura vieja
      const producto = await findAccessibleProduct(req, id, { transaction: t, lock: t.LOCK.UPDATE })

      if (!producto) {
        await t.rollback();
        return res.status(404).json({ message: "Producto no encontrado" })
      }

      const delta = stockObjetivo - Number(producto.stock)
      if (delta !== 0) {
        await aplicarMovimiento({ productoId: producto.id_producto, delta, tipo: delta > 0 ? 'ajuste_entrada' : 'ajuste_salida', referenciaTipo: 'ajuste_producto', referenciaId: producto.id_producto, motivo: 'Ajuste manual de stock', usuarioId: req.user.id_user, affiliateBusinessId: producto.affiliate_business_id || null, costoUnitario: producto.costo_promedio, transaction: t })
        await producto.reload({ transaction: t })
      }
      await t.commit()

      const productoData = sinCostos(req, producto.toJSON());
      // Generar URL completa para la imagen
      if (productoData.imagen_url) {
        productoData.imagen_url = generarUrlCompleta(productoData.imagen_url, req);
      }

      return res.status(200).json({
        message: "Stock actualizado exitosamente",
        producto: productoData,
      })
      } catch (error) {
      await t.rollback();
      console.error("Error al actualizar el stock:", error)
      return res.status(500).json({
        message: "Error al actualizar el stock",
        error: error.message,
      })
    }
  },

  // Disminuir el stock de un producto
  decrementStock: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params
      const cantidad = Number(req.body.cantidad ?? 1)

      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        await t.rollback();
        return res.status(400).json({ message: "La cantidad debe ser mayor a 0" })
      }

      const producto = await findAccessibleProduct(req, id, { transaction: t, lock: t.LOCK.UPDATE })

      if (!producto) {
        await t.rollback();
        return res.status(404).json({ message: "Producto no encontrado" })
      }

      // Decremento atomico guardado + kardex (antes: RMW en JS, sin movimiento y pisaba ventas concurrentes)
      try {
        await aplicarMovimiento({ productoId: producto.id_producto, delta: -cantidad, tipo: 'ajuste_salida', referenciaTipo: 'ajuste_producto', referenciaId: producto.id_producto, motivo: String(req.body.motivo || '').trim() || 'Decremento manual de stock', usuarioId: req.user.id_user, affiliateBusinessId: producto.affiliate_business_id || null, costoUnitario: producto.costo_promedio, transaction: t })
      } catch (error) {
        if (error.status !== 400) throw error
        await t.rollback();
        return res.status(400).json({
          message: "No hay suficiente stock disponible",
          stockActual: error.stockActual,
          cantidadSolicitada: cantidad,
        })
      }
      await producto.reload({ transaction: t })
      await t.commit()

      const productoData = sinCostos(req, producto.toJSON());
      // Generar URL completa para la imagen
      if (productoData.imagen_url) {
        productoData.imagen_url = generarUrlCompleta(productoData.imagen_url, req);
      }

      return res.status(200).json({
        message: "Stock disminuido exitosamente",
        producto: productoData,
      })
    } catch (error) {
      await t.rollback();
      console.error("Error al disminuir el stock:", error)
      return res.status(500).json({
        message: "Error al disminuir el stock",
        error: error.message,
      })
    }
  },

  // Asignar o actualizar oferta a un producto
  setOferta: async (req, res) => {
    try {
      const body = req.body || {};
      const { id_producto } = body;
      if (!id_producto) {
        return res.status(400).json({ message: "Debe enviar 'id_producto' y 'descuento' (1-99) o 'precio_fijo'" });
      }
      let producto = await findAccessibleProduct(req, id_producto);
      if (!producto) {
        return res.status(404).json({ message: 'Producto no encontrado' });
      }
      // Misma logica que PUT /ofertas-del-dia: escribe producto y fila ofertas en una transaccion
      const { ok, resultados } = await aplicarOfertas([{ id_producto, descuento: body.descuento, precio_fijo: body.precio_fijo }]);
      if (!ok) {
        return res.status(400).json({ message: resultados[0].motivo, resultados });
      }
      producto = await findAccessibleProduct(req, id_producto);

      const productoData = sinCostos(req, producto.toJSON());
      // Generar URL completa para la imagen
      if (productoData.imagen_url) {
        productoData.imagen_url = generarUrlCompleta(productoData.imagen_url, req);
      }

      return res.status(200).json({
        message: 'Oferta asignada correctamente',
        producto: productoData,
      });
    } catch (error) {
      console.error('Error al asignar oferta:', error);
      return res.status(500).json({
        message: 'Error al asignar oferta',
        error: error.message,
      });
    }
  },

  // Eliminar un producto
  delete: async (req, res) => {
    try {
      const { id } = req.params

      const producto = await findAccessibleProduct(req, id)

      if (!producto) {
        return res.status(404).json({ message: "Producto no encontrado" })
      }

      // Un producto con historial (ventas, compras, movimientos) no se borra: se perderia trazabilidad
      const historial = await Promise.all([
        DetalleVenta.count({ where: { producto_id: producto.id_producto } }),
        CompraDetalle.count({ where: { producto_id: producto.id_producto } }),
        MovimientoInventario.count({ where: { producto_id: producto.id_producto } }),
      ])
      if (historial.some(n => n > 0)) {
        return res.status(409).json({ message: "Este producto tiene ventas, compras o movimientos registrados y no se puede eliminar. Deja su stock en 0 para retirarlo." })
      }

      // Si el producto tiene una imagen, eliminarla del sistema de archivos
      if (producto.imagen_url) {
        try {
          // Construir la ruta completa del archivo
          const imagePath = path.join(__dirname, '../../src', producto.imagen_url);
          
          // Verificar si el archivo existe y eliminarlo
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);

          }
        } catch (error) {
          console.error('Error al eliminar imagen del producto:', error);
          // No fallar la eliminación del producto si hay error al eliminar la imagen
        }
      }

      await producto.destroy()

      return res.status(200).json({
        message: "Producto eliminado exitosamente",
      })
    } catch (error) {
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(409).json({ message: "El producto está vinculado a otros registros (pedidos, carritos u órdenes de servicio) y no se puede eliminar." })
      }
      console.error("Error al eliminar el producto:", error)
      return res.status(500).json({
        message: "Error al eliminar el producto",
        error: error.message,
      })
    }  },

  // Eliminar imagen de un producto
  deleteImage: async (req, res) => {
    try {
      const { id } = req.params

      const producto = await findAccessibleProduct(req, id)

      if (!producto) {
        return res.status(404).json({ message: "Producto no encontrado" })
      }

      if (!producto.imagen_url) {
        return res.status(400).json({ message: "El producto no tiene imagen para eliminar" })
      }

      // Eliminar la imagen del sistema de archivos
      try {
        // Construir la ruta completa del archivo
        const imagePath = path.join(__dirname, '../../src', producto.imagen_url);
        
        // Verificar si el archivo existe y eliminarlo
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (error) {
        console.error('Error al eliminar archivo de imagen:', error);
        // Continuar para actualizar la base de datos aunque falle la eliminación del archivo
      }

      // Actualizar el producto para remover la referencia a la imagen
      producto.imagen_url = null;
      await producto.save();

      return res.status(200).json({
        message: "Imagen del producto eliminada exitosamente",
        producto,
      })
    } catch (error) {
      console.error("Error al eliminar imagen del producto:", error)
      return res.status(500).json({
        message: "Error al eliminar imagen del producto",
        error: error.message,
      })
    }
  },
}

module.exports = productoController
