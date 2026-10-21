// Middleware para validar datos de categoría
const validateCategoria = (req, res, next) => {
  const { nombre } = req.body;
  
  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
    return res.status(400).json({ 
      message: 'El nombre de la categoría es obligatorio y debe ser un texto válido' 
    });
  }
  
  next();
};

// Middleware para validar datos de producto
const validateProducto = (req, res, next) => {
  const { sku, nombre, precio_unitario, id_categoria } = req.body;
  const errors = [];
  const isUpdate = req.method === 'PUT' || req.method === 'PATCH';

  // Para actualizaciones, solo validar campos que se envían
  // Para creaciones, todos los campos son obligatorios
  
  if (!isUpdate) {
    // Validación para POST (crear) - todos los campos obligatorios
    if (!sku || typeof sku !== 'string' || sku.trim() === '') {
      errors.push('El SKU es obligatorio y debe ser un texto válido');
    }

    if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
      errors.push('El nombre es obligatorio y debe ser un texto válido');
    }

    // Convertir precio_unitario a número y validar
    const precioNumerico = parseFloat(precio_unitario);
    if (precio_unitario === undefined || precio_unitario === null || precio_unitario === '' || isNaN(precioNumerico) || precioNumerico <= 0) {
      errors.push('El precio unitario es obligatorio y debe ser mayor que cero');
    }

    // Convertir id_categoria a número y validar
    const categoriaNumerico = parseInt(id_categoria);
    if (id_categoria === undefined || id_categoria === null || id_categoria === '' || isNaN(categoriaNumerico) || categoriaNumerico <= 0) {
      errors.push('El ID de la categoría es obligatorio y debe ser un número positivo');
    }
  } else {
    // Validación para PUT/PATCH (actualizar) - solo validar campos presentes
    if (sku !== undefined && (typeof sku !== 'string' || sku.trim() === '')) {
      errors.push('El SKU debe ser un texto válido');
    }

    if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim() === '')) {
      errors.push('El nombre debe ser un texto válido');
    }

    if (precio_unitario !== undefined) {
      const precioNumerico = parseFloat(precio_unitario);
      if (precio_unitario === '' || isNaN(precioNumerico) || precioNumerico <= 0) {
        errors.push('El precio unitario debe ser mayor que cero');
      }
    }

    if (id_categoria !== undefined) {
      const categoriaNumerico = parseInt(id_categoria);
      if (id_categoria === '' || isNaN(categoriaNumerico) || categoriaNumerico <= 0) {
        errors.push('El ID de la categoría debe ser un número positivo');
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      message: 'Error de validación',
      errors
    });
  }

  next();
};

// Middleware para validar actualización de stock
const validateStock = (req, res, next) => {
  const { cantidad } = req.body;
  
  if (cantidad === undefined || isNaN(parseInt(cantidad)) || parseInt(cantidad) < 0) {
    return res.status(400).json({ 
      message: 'La cantidad es obligatoria y debe ser un número no negativo' 
    });
  }
  
  next();
};

// Validación de venta
const validateVenta = (req, res, next) => {
const { id_cajero, metodo_pago, items } = req.body;

if (!id_cajero || !metodo_pago || !items || !Array.isArray(items) || items.length === 0) {
  return res.status(400).json({ 
    message: 'Datos incompletos. Se requiere id_cajero, metodo_pago y al menos un ítem' 
  });
}

// Validar que cada item tenga un código de barras
const itemsValidos = items.every(item => 
  item.codigo_barras && 
  typeof item.codigo_barras === 'string' && 
  item.codigo_barras.trim() !== ''
);

if (!itemsValidos) {
  return res.status(400).json({ 
    message: 'Cada ítem debe contener un código de barras válido' 
  });
}

next();
};
// Validación de comprobante (factura/boleta)
const validateComprobante = (req, res, next) => {
  const { tipo_documento, cliente_tipo_documento, cliente_numero_documento, cliente_nombre } = req.body;
  const errors = [];

  if (!tipo_documento || !['1', '3'].includes(tipo_documento)) {
    errors.push('El tipo de documento debe ser 1 (Factura) o 3 (Boleta)');
  }

  if (!cliente_tipo_documento || !['1', '6'].includes(cliente_tipo_documento)) {
    errors.push('El tipo de documento del cliente debe ser 1 (DNI) o 6 (RUC)');
  }

  if (!cliente_numero_documento || typeof cliente_numero_documento !== 'string') {
    errors.push('El número de documento del cliente es obligatorio');
  } else {
    // Validar formato según tipo
    if (cliente_tipo_documento === '1' && cliente_numero_documento.length !== 8) {
      errors.push('El DNI debe tener 8 dígitos');
    } else if (cliente_tipo_documento === '6' && cliente_numero_documento.length !== 11) {
      errors.push('El RUC debe tener 11 dígitos');
    }
  }

  if (!cliente_nombre || typeof cliente_nombre !== 'string' || cliente_nombre.trim() === '') {
    errors.push('El nombre o razón social del cliente es obligatorio');
  }

  // Validar coherencia entre tipo de documento y documento del cliente
  if (tipo_documento === '1' && cliente_tipo_documento !== '6') {
    errors.push('Para facturas, el cliente debe tener RUC (tipo 6)');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      message: 'Error de validación del comprobante',
      errors
    });
  }

  next();
};

module.exports = {
  validateCategoria,
  validateProducto,
  validateStock,
  validateVenta,
  validateComprobante  // Exportamos el nuevo middleware
};