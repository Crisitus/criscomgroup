const { sequelize, Importacion, Producto, MovimientoInventario } = require('../models');

const numericFields = ['costo_mercancia', 'flete', 'seguro', 'tributos', 'otros_costos'];
const writableFields = ['producto_id', 'cantidad', 'tipo_cambio', 'referencia', 'proveedor', 'pais_origen', 'descripcion', 'tracking', 'regimen_aduanero', 'moneda', ...numericFields, 'estado', 'fecha_embarque', 'fecha_llegada_estimada', 'dam_dua', 'notas_contables'];

const normalize = body => {
  const data = Object.fromEntries(writableFields.filter(field => body[field] !== undefined).map(field => [field, body[field]]));
  numericFields.forEach(field => { data[field] = Number(data[field] || 0); });
  data.producto_id = Number(data.producto_id || 0) || null;
  data.cantidad = Number(data.cantidad || 0);
  data.tipo_cambio = Number(data.tipo_cambio || 0);
  if (data.moneda === 'PEN') data.tipo_cambio = 1;
  if (!String(data.referencia || '').trim() || !String(data.proveedor || '').trim() || !String(data.pais_origen || '').trim() || !String(data.descripcion || '').trim()) {
    throw new Error('Referencia, proveedor, país de origen y descripción son obligatorios');
  }
  if (numericFields.some(field => !Number.isFinite(data[field]) || data[field] < 0)) throw new Error('Los costos deben ser números no negativos');
  if (!data.producto_id && data.estado === 'recibida') throw new Error('Para recibir la importación, asóciala a un producto del inventario');
  if (data.estado && !['planificada', 'en_transito', 'en_aduanas', 'liberada', 'recibida', 'cancelada'].includes(data.estado)) throw new Error('Estado de importación inválido');
  if (!Number.isInteger(data.cantidad) || data.cantidad < 1) throw new Error('La cantidad importada debe ser un entero mayor que cero');
  if (!Number.isFinite(data.tipo_cambio) || data.tipo_cambio <= 0) throw new Error('El tipo de cambio debe ser mayor que cero');
  return data;
};

const include = [{ model: Producto.scope('allBusinesses'), as: 'producto', attributes: ['id_producto', 'nombre', 'sku', 'stock'] }];

const receiveInventory = async (record, userId, transaction) => {
  if (record.estado !== 'recibida' || record.inventario_registrado_en) return;
  const product = await Producto.scope('allBusinesses').findByPk(record.producto_id, { transaction, lock: transaction.LOCK.UPDATE });
  if (!product || product.affiliate_business_id) throw new Error('Producto de inventario no encontrado');
  const quantity = Number(record.cantidad);
  if (Number(record.cantidad) < 1) throw new Error('La cantidad importada debe ser mayor que cero');
  const totalForeign = numericFields.reduce((sum, field) => sum + Number(record[field] || 0), 0);
  const landedUnitCost = (totalForeign * Number(record.tipo_cambio || 1)) / quantity;
  const oldStock = Number(product.stock);
  const newStock = oldStock + quantity;
  const oldCost = Number(product.costo_promedio || 0);
  const weightedCost = ((oldStock * oldCost) + (quantity * landedUnitCost)) / newStock;
  await product.update({ stock: newStock, ultimo_costo: landedUnitCost, costo_promedio: weightedCost, origen: 'importado' }, { transaction });
  await MovimientoInventario.create({
    producto_id: product.id_producto,
    tipo: 'compra',
    cantidad: quantity,
    stock_anterior: oldStock,
    stock_nuevo: newStock,
    costo_unitario: landedUnitCost,
    referencia_tipo: 'importacion',
    referencia_id: record.id_importacion,
    motivo: `Importación ${record.referencia}`,
    usuario_id: userId,
    affiliate_business_id: null,
  }, { transaction });
  await record.update({ inventario_registrado_en: new Date() }, { transaction });
};

exports.list = async (_req, res) => res.json(await Importacion.findAll({ include, order: [['creado_en', 'DESC']] }));

exports.create = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const record = await Importacion.create({ ...normalize(req.body), creado_por: req.user.id_user }, { transaction });
    await receiveInventory(record, req.user.id_user, transaction);
    await transaction.commit();
    res.status(201).json(await Importacion.findByPk(record.id_importacion, { include }));
  } catch (error) {
    await transaction.rollback();
    res.status(400).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const record = await Importacion.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!record) { await transaction.rollback(); return res.status(404).json({ message: 'Importación no encontrada' }); }
    const data = normalize(req.body);
    if (record.estado === 'cancelada' && data.estado !== 'cancelada') {
      throw new Error('Una importación cancelada no se puede reabrir; registra una nueva');
    }
    if (record.inventario_registrado_en) {
      // El costo ya entró al costo promedio del producto: cambiarlo aquí dejaría el inventario descuadrado
      const locked = ['producto_id', 'cantidad', 'moneda', 'tipo_cambio', ...numericFields];
      const changed = locked.filter(field => {
        const before = record[field]; const after = data[field];
        if (after === undefined) return false;
        return typeof after === 'number' ? Math.abs(Number(before) - after) > 0.000001 : String(before) !== String(after);
      });
      if (changed.length) throw new Error(`Ya ingresó al inventario: no se puede cambiar ${changed.join(', ')}. Registra la diferencia como un ajuste de costo aparte.`);
      if (data.estado && data.estado !== 'recibida') throw new Error('Una importación recibida no puede cambiar de estado (el stock ya ingresó)');
    }
    await record.update(data, { transaction });
    await receiveInventory(record, req.user.id_user, transaction);
    await transaction.commit();
    res.json(await Importacion.findByPk(record.id_importacion, { include }));
  } catch (error) {
    await transaction.rollback();
    res.status(400).json({ message: error.message });
  }
};

exports.remove = async (req, res) => {
  const record = await Importacion.findByPk(req.params.id);
  if (!record) return res.status(404).json({ message: 'Importación no encontrada' });
  if (record.inventario_registrado_en) return res.status(409).json({ message: 'No se puede eliminar una importación que ya generó stock' });
  await record.destroy();
  res.status(204).end();
};
