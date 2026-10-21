const { sequelize, CarritoItem, Producto } = require('../models');

const productInclude = [{ model: Producto.scope('allBusinesses'), as: 'producto' }];
const userId = req => Number(req.user.id_user || req.user.id);
const normalizeQuantity = value => {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= 999 ? quantity : null;
};
const findProduct = (id, transaction) => {
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId < 1) return null;
  return Producto.scope('allBusinesses').findByPk(productId, { transaction });
};
const serialize = item => ({ id_carrito_item: item.id_carrito_item, id_producto: item.id_producto, cantidad: item.cantidad, producto: item.producto });

exports.list = async (req, res) => {
  try {
    const items = await CarritoItem.findAll({ where: { id_usuario: userId(req) }, include: productInclude, order: [['actualizado_en', 'DESC']] });
    res.json({ success: true, items: items.map(serialize) });
  } catch {
    res.status(500).json({ success: false, message: 'No se pudo cargar el carrito' });
  }
};

exports.add = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const quantity = normalizeQuantity(req.body.cantidad);
    const product = await findProduct(req.body.id_producto, transaction);
    if (!quantity || !product) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Producto o cantidad inválida' });
    }
    let item = await CarritoItem.findOne({ where: { id_usuario: userId(req), id_producto: product.id_producto }, transaction, lock: transaction.LOCK.UPDATE });
    const nextQuantity = (item?.cantidad || 0) + quantity;
    if (nextQuantity > 999) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'La cantidad máxima por producto es 999' });
    }
    if (item) await item.update({ cantidad: nextQuantity }, { transaction });
    else item = await CarritoItem.create({ id_usuario: userId(req), id_producto: product.id_producto, cantidad: quantity }, { transaction });
    await transaction.commit();
    item = await CarritoItem.findByPk(item.id_carrito_item, { include: productInclude });
    res.status(201).json({ success: true, item: serialize(item) });
  } catch {
    await transaction.rollback();
    res.status(500).json({ success: false, message: 'No se pudo agregar el producto al carrito' });
  }
};

exports.update = async (req, res) => {
  try {
    const quantity = normalizeQuantity(req.body.cantidad);
    const product = await findProduct(req.params.productId);
    if (!quantity || !product) return res.status(400).json({ success: false, message: 'Producto o cantidad inválida' });
    const item = await CarritoItem.findOne({ where: { id_usuario: userId(req), id_producto: product.id_producto } });
    if (!item) return res.status(404).json({ success: false, message: 'El producto no está en el carrito' });
    await item.update({ cantidad: quantity });
    const updated = await CarritoItem.findByPk(item.id_carrito_item, { include: productInclude });
    res.json({ success: true, item: serialize(updated) });
  } catch {
    res.status(500).json({ success: false, message: 'No se pudo actualizar el carrito' });
  }
};

exports.remove = async (req, res) => {
  const deleted = await CarritoItem.destroy({ where: { id_usuario: userId(req), id_producto: Number(req.params.productId) } });
  res.status(deleted ? 200 : 404).json({ success: Boolean(deleted), message: deleted ? 'Producto eliminado' : 'El producto no está en el carrito' });
};

exports.clear = async (req, res) => {
  await CarritoItem.destroy({ where: { id_usuario: userId(req) } });
  res.json({ success: true, items: [] });
};

exports.merge = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
    const normalized = new Map();
    for (const requested of requestedItems) {
      const productId = Number(requested.productId ?? requested.id_producto);
      const quantity = normalizeQuantity(requested.quantity ?? requested.cantidad);
      if (!Number.isInteger(productId) || !quantity) continue;
      normalized.set(productId, Math.min(999, (normalized.get(productId) || 0) + quantity));
    }
    for (const [productId, quantity] of normalized) {
      const product = await findProduct(productId, transaction);
      if (!product) continue;
      const [item, created] = await CarritoItem.findOrCreate({ where: { id_usuario: userId(req), id_producto: productId }, defaults: { cantidad: quantity }, transaction });
      if (!created) await item.update({ cantidad: Math.min(999, item.cantidad + quantity) }, { transaction });
    }
    await transaction.commit();
    return exports.list(req, res);
  } catch {
    await transaction.rollback();
    res.status(500).json({ success: false, message: 'No se pudo fusionar el carrito' });
  }
};
