const { Op } = require('sequelize');
const { sequelize, Proveedor, Compra, CompraDetalle, MovimientoInventario, Cotizacion, CotizacionDetalle, Producto, Venta, DetalleVenta, InventarioUbicacion, InventarioQuant } = require('../models');
const { identityFor } = require('../services/inventory-quant.service');
const { aplicarMovimiento } = require('../services/stock.service');

const IGV = 0.18;
const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const net = n => round2(Number(n) / (1 + IGV));

const businessId = req => req.user.tipo_vendedor === 'afiliado' ? Number(req.user.affiliate_business_id) : null;
const scopeWhere = req => ({ affiliate_business_id: businessId(req) });
const productFor = async (req, id, transaction) => {
  const product = await Producto.scope('allBusinesses').findByPk(Number(id), { transaction, lock: transaction?.LOCK?.UPDATE });
  if (!product || Number(product.affiliate_business_id || 0) !== Number(businessId(req) || 0)) throw new Error('Producto fuera de tu inventario');
  return product;
};
const positive = (value, label) => { const n = Number(value); if (!Number.isFinite(n) || n <= 0) throw new Error(`${label} inválido`); return n; };
const positiveInt = (value, label) => { const n = Number(value); if (!Number.isInteger(n) || n <= 0) throw new Error(`${label} debe ser un número entero mayor que cero`); return n; };
const nextNumber = prefix => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase();

// Express 4 no captura rechazos de promesas: sin esto una excepcion deja la peticion colgada
const safe = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (error) {
    console.error('commercial.controller:', error);
    if (!res.headersSent) res.status(500).json({ message: 'No se pudo completar la operación' });
  }
};
// El handler devuelve [status, body]; se responde DESPUES del commit para que el cliente no lea datos sin confirmar
const inTransaction = fn => async (req, res) => {
  const transaction = await sequelize.transaction();
  try { const [status, body] = await fn(req, res, transaction); await transaction.commit(); res.status(status).json(body); }
  catch (error) {
    await transaction.rollback();
    if (!res.headersSent) res.status(error.status || 400).json({ message: error.message });
  }
};
const fail = (message, status = 400) => Object.assign(new Error(message), { status });

// ---------- Inventario ----------
// Margen sobre precio NETO (sin IGV): el costo de compra no incluye IGV (credito fiscal)
const productMetrics = v => {
  const priceNet = net(v.precio_unitario_con_igv);
  const cost = Number(v.costo_promedio);
  const quants = v.quants || [];
  const ubicado = quants.reduce((s, q) => s + Number(q.disponible), 0);
  const reservado = quants.reduce((s, q) => s + Number(q.reservado), 0);
  return {
    stock_disponible: Number(v.stock),
    stock_reservado: reservado,
    stock_fisico: Number(v.stock) + reservado,
    stock_sin_ubicar: Math.max(0, Number(v.stock) - ubicado),
    valor_stock: round2((Number(v.stock) + reservado) * cost),
    precio_neto: priceNet,
    margen_unitario: round2(priceNet - cost),
    margen_porcentaje: priceNet > 0 && cost > 0 ? round2(((priceNet - cost) / priceNet) * 100) : null,
    costo_conocido: cost > 0,
    bajo_minimo: Number(v.stock_minimo) > 0 && Number(v.stock) <= Number(v.stock_minimo),
  };
};

exports.dashboard = safe(async (req, res) => {
  const products = await Producto.scope('allBusinesses').findAll({ where: scopeWhere(req), attributes: ['id_producto', 'nombre', 'sku', 'stock', 'stock_minimo', 'costo_promedio', 'ultimo_costo', 'precio_unitario_con_igv', 'ubicacion'], include: [{ model: InventarioQuant, as: 'quants', required: false, include: [{ model: InventarioUbicacion, as: 'ubicacion', attributes: ['id_ubicacion_inventario', 'codigo', 'nombre', 'tipo'] }] }], order: [['nombre', 'ASC']] });
  const rows = products.map(p => { const v = p.toJSON(); return { ...v, ...productMetrics(v) }; });
  res.json({ products: rows, summary: { productos: rows.length, unidades: rows.reduce((s, p) => s + Number(p.stock), 0), valor_stock: round2(rows.reduce((s, p) => s + p.valor_stock, 0)), bajo_minimo: rows.filter(p => p.bajo_minimo).length, sin_costo: rows.filter(p => !p.costo_conocido && Number(p.stock) > 0).length } });
});

exports.locations = safe(async (req, res) => res.json(await InventarioUbicacion.findAll({ where: scopeWhere(req), order: [['nombre', 'ASC']] })));
exports.createLocation = inTransaction(async (req, res, transaction) => {
  const codigo = String(req.body.codigo || '').trim().toUpperCase();
  const nombre = String(req.body.nombre || '').trim();
  const tipo = req.body.tipo || 'almacen';
  if (!codigo || !nombre) throw fail('Código y nombre son obligatorios');
  if (!['almacen', 'tienda', 'taller', 'transito', 'virtual'].includes(tipo)) throw fail('Tipo de ubicación inválido');
  const negocio = businessId(req) ? `affiliate:${businessId(req)}` : 'central';
  if (await InventarioUbicacion.findOne({ where: { negocio_clave: negocio, codigo }, transaction })) throw fail(`Ya existe una ubicación con el código ${codigo}`, 409);
  const item = await InventarioUbicacion.create({ codigo, nombre, tipo, negocio_clave: negocio, affiliate_business_id: businessId(req) }, { transaction });
  return [201, item];
});
exports.setQuant = inTransaction(async (req, res, transaction) => {
  const product = await productFor(req, req.params.id, transaction);
  const location = await InventarioUbicacion.findOne({ where: { id_ubicacion_inventario: Number(req.body.ubicacion_id), ...scopeWhere(req), activa: true }, transaction });
  if (!location) throw fail('Ubicación no encontrada');
  const available = Number(req.body.disponible);
  const lot = String(req.body.lote || '').trim() || null;
  const serial = String(req.body.numero_serie || '').trim() || null;
  if (!Number.isInteger(available) || available < 0) throw fail('Disponible debe ser un entero no negativo');
  if (serial && available > 1) throw fail('Una serie identifica una sola unidad');
  if (serial) {
    const dup = await InventarioQuant.findOne({ where: { producto_id: product.id_producto, numero_serie: serial, ubicacion_id: { [Op.ne]: location.id_ubicacion_inventario } }, transaction });
    if (dup) throw fail(`La serie ${serial} ya está registrada en otra ubicación`);
  }
  const identity = identityFor({ lote: lot, numero_serie: serial });
  let quant = await InventarioQuant.findOne({ where: { producto_id: product.id_producto, ubicacion_id: location.id_ubicacion_inventario, identidad: identity }, transaction, lock: transaction.LOCK.UPDATE });
  const others = Number(await InventarioQuant.sum('disponible', { where: { producto_id: product.id_producto, ...(quant ? { id_quant_inventario: { [Op.ne]: quant.id_quant_inventario } } : {}) }, transaction }) || 0);
  if (others + available > Number(product.stock)) throw fail(`La distribución supera el stock global disponible (${product.stock})`);
  const values = { producto_id: product.id_producto, ubicacion_id: location.id_ubicacion_inventario, lote: lot, numero_serie: serial, condicion: req.body.condicion || product.condicion, identidad: identity, disponible: available, affiliate_business_id: businessId(req) };
  if (quant) { if (Number(quant.reservado) > 0 && available !== Number(quant.disponible)) throw fail('No se puede redistribuir un quant con reservas activas'); await quant.update(values, { transaction }); }
  else quant = await InventarioQuant.create(values, { transaction });
  return [200, quant];
});

exports.movements = safe(async (req, res) => {
  const where = { ...scopeWhere(req) };
  if (req.query.producto_id) where.producto_id = Number(req.query.producto_id);
  res.json(await MovimientoInventario.findAll({ where, include: [{ model: Producto.scope('allBusinesses'), as: 'producto', attributes: ['nombre', 'sku'] }], order: [['creado_en', 'DESC']], limit: Math.min(Number(req.query.limit) || 500, 500) }));
});
exports.adjust = inTransaction(async (req, res, transaction) => {
  const product = await productFor(req, req.params.id, transaction);
  const qty = positiveInt(req.body.cantidad, 'La cantidad');
  const incoming = req.body.tipo === 'ajuste_entrada';
  if (!incoming && req.body.tipo !== 'ajuste_salida') throw fail('Tipo de ajuste inválido');
  const motivo = String(req.body.motivo || '').trim();
  if (!motivo) throw fail('Indica el motivo del ajuste');
  const old = Number(product.stock);
  const next = incoming ? old + qty : old - qty;
  if (next < 0) throw fail('El ajuste dejaría stock negativo');
  if (!incoming) {
    const ubicado = Number(await InventarioQuant.sum('disponible', { where: { producto_id: product.id_producto }, transaction }) || 0);
    if (ubicado > next) throw fail(`Hay ${ubicado} unidades asignadas a ubicaciones; reduce primero la existencia en la ubicación correspondiente`);
  }
  const minimo = req.body.stock_minimo === undefined || req.body.stock_minimo === '' ? product.stock_minimo : Number(req.body.stock_minimo);
  if (!Number.isInteger(minimo) || minimo < 0) throw fail('El stock mínimo debe ser un entero no negativo');
  await aplicarMovimiento({ productoId: product.id_producto, delta: incoming ? qty : -qty, tipo: req.body.tipo, referenciaTipo: 'ajuste', motivo, usuarioId: req.user.id_user, affiliateBusinessId: businessId(req), costoUnitario: product.costo_promedio, transaction });
  await product.update({ stock_minimo: minimo, ubicacion: req.body.ubicacion ?? product.ubicacion }, { transaction });
  await product.reload({ transaction });
  return [200, product];
});

// ---------- Proveedores ----------
const supplierFields = ['razon_social', 'ruc_documento', 'contacto', 'telefono', 'email', 'direccion', 'ciudad', 'dias_credito', 'activo'];
const supplierData = (body, partial) => {
  const data = Object.fromEntries(supplierFields.filter(k => body[k] !== undefined).map(k => [k, typeof body[k] === 'string' ? body[k].trim() || null : body[k]]));
  if (!partial || data.razon_social !== undefined) { if (!data.razon_social) throw fail('La razón social es obligatoria', 422); }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw fail('Correo del proveedor inválido', 422);
  if (data.dias_credito !== undefined) { const d = Number(data.dias_credito || 0); if (!Number.isInteger(d) || d < 0 || d > 365) throw fail('Días de crédito debe ser un entero entre 0 y 365', 422); data.dias_credito = d; }
  if (data.activo !== undefined) data.activo = Boolean(data.activo);
  return data;
};
exports.listSuppliers = safe(async (req, res) => res.json(await Proveedor.findAll({ where: scopeWhere(req), order: [['razon_social', 'ASC']] })));
exports.createSupplier = inTransaction(async (req, res, transaction) => {
  const item = await Proveedor.create({ ...supplierData(req.body, false), affiliate_business_id: businessId(req) }, { transaction });
  return [201, item];
});
exports.updateSupplier = inTransaction(async (req, res, transaction) => {
  const item = await Proveedor.findOne({ where: { id_proveedor: req.params.id, ...scopeWhere(req) }, transaction });
  if (!item) throw fail('Proveedor no encontrado', 404);
  await item.update(supplierData(req.body, true), { transaction }); return [200, item];
});

// ---------- Compras ----------
const purchaseInclude = [{ model: Proveedor, as: 'proveedor' }, { model: CompraDetalle, as: 'detalles', include: [{ model: Producto.scope('allBusinesses'), as: 'producto', attributes: ['id_producto', 'nombre', 'sku'] }] }];
exports.listPurchases = safe(async (req, res) => res.json(await Compra.findAll({ where: scopeWhere(req), include: purchaseInclude, order: [['fecha', 'DESC'], ['id_compra', 'DESC']] })));
exports.createPurchase = inTransaction(async (req, res, transaction) => {
  if (!Array.isArray(req.body.items) || !req.body.items.length) throw fail('Agrega al menos un producto');
  const supplier = await Proveedor.findOne({ where: { id_proveedor: Number(req.body.proveedor_id), ...scopeWhere(req) }, transaction });
  if (!supplier) throw fail('Proveedor no encontrado');
  if (!supplier.activo) throw fail(`${supplier.razon_social} está inactivo: reactívalo para registrarle compras`);
  const moneda = req.body.moneda || 'PEN';
  if (!['PEN', 'USD'].includes(moneda)) throw fail('Moneda inválida');
  const tc = moneda === 'PEN' ? 1 : positive(req.body.tipo_cambio, 'Tipo de cambio');
  const seen = new Set();
  const raw = [];
  for (const item of req.body.items) {
    const product = await productFor(req, item.producto_id, transaction);
    if (seen.has(product.id_producto)) throw fail(`${product.nombre} está repetido: suma las cantidades en una sola línea`);
    seen.add(product.id_producto);
    raw.push({ product, quantity: positiveInt(item.cantidad, 'La cantidad'), cost: positive(item.costo_unitario, 'Costo') });
  }
  const extrasRaw = Number(req.body.costos_adicionales || 0);
  if (!Number.isFinite(extrasRaw) || extrasRaw < 0) throw fail('Los costos adicionales no pueden ser negativos');
  const base = raw.reduce((s, i) => s + i.quantity * i.cost, 0);
  const total = round2(base + extrasRaw); // en la moneda del documento
  const purchase = await Compra.create({ numero: nextNumber('COM'), proveedor_id: supplier.id_proveedor, fecha: req.body.fecha || new Date(), documento: String(req.body.documento || '').trim() || null, moneda, tipo_cambio: tc, costos_adicionales: extrasRaw, total, estado: 'recibida', notas: req.body.notas || null, creado_por: req.user.id_user, affiliate_business_id: businessId(req) }, { transaction });
  for (const item of raw) {
    // Flete prorrateado por valor y todo convertido a soles: el costo promedio del inventario es en PEN
    const allocated = base ? extrasRaw * ((item.quantity * item.cost) / base) / item.quantity : 0;
    const landed = round2((item.cost + allocated) * tc);
    const oldStock = Number(item.product.stock); const oldCost = Number(item.product.costo_promedio || 0); const newStock = oldStock + item.quantity;
    const weighted = newStock ? ((oldStock * oldCost) + (item.quantity * landed)) / newStock : landed;
    await CompraDetalle.create({ compra_id: purchase.id_compra, producto_id: item.product.id_producto, cantidad: item.quantity, costo_unitario: item.cost, costo_asignado: landed, subtotal: round2(item.quantity * landed) }, { transaction });
    await aplicarMovimiento({ productoId: item.product.id_producto, delta: item.quantity, tipo: 'compra', referenciaTipo: 'compra', referenciaId: purchase.id_compra, motivo: `Compra ${purchase.numero}${purchase.documento ? ` · ${purchase.documento}` : ''}`, usuarioId: req.user.id_user, affiliateBusinessId: businessId(req), costoUnitario: landed, transaction });
    await item.product.update({ ultimo_costo: landed, costo_promedio: weighted }, { transaction });
  }
  return [201, await Compra.findByPk(purchase.id_compra, { include: purchaseInclude, transaction })];
});
// Anular revierte stock y costo promedio; solo si las unidades siguen en inventario
exports.voidPurchase = inTransaction(async (req, res, transaction) => {
  const purchase = await Compra.findOne({ where: { id_compra: req.params.id, ...scopeWhere(req) }, include: [{ model: CompraDetalle, as: 'detalles' }], transaction, lock: transaction.LOCK.UPDATE });
  if (!purchase) throw fail('Compra no encontrada', 404);
  if (purchase.estado !== 'recibida') throw fail('Solo se puede anular una compra recibida', 409);
  const motivo = String(req.body.motivo || '').trim();
  if (!motivo) throw fail('Indica el motivo de la anulación');
  for (const line of purchase.detalles) {
    const product = await productFor(req, line.producto_id, transaction);
    const qty = Number(line.cantidad); const old = Number(product.stock);
    if (old < qty) throw fail(`No se puede anular: de ${product.nombre} solo quedan ${old} de ${qty} unidades (ya se vendieron o usaron)`, 409);
    const next = old - qty;
    const ubicado = Number(await InventarioQuant.sum('disponible', { where: { producto_id: product.id_producto }, transaction }) || 0);
    if (ubicado > next) throw fail(`No se puede anular: ${product.nombre} tiene ${ubicado} unidades asignadas a ubicaciones; libera ${ubicado - next} primero`, 409);
    const avg = Number(product.costo_promedio || 0);
    const reverted = next > 0 ? Math.max(0, ((old * avg) - (qty * Number(line.costo_asignado))) / next) : avg;
    await aplicarMovimiento({ productoId: product.id_producto, delta: -qty, tipo: 'ajuste_salida', referenciaTipo: 'anulacion_compra', referenciaId: purchase.id_compra, motivo: `Anulación ${purchase.numero}: ${motivo}`.slice(0, 255), usuarioId: req.user.id_user, affiliateBusinessId: businessId(req), costoUnitario: line.costo_asignado, transaction });
    await product.update({ costo_promedio: reverted }, { transaction });
  }
  await purchase.update({ estado: 'anulada', notas: [purchase.notas, `Anulada: ${motivo}`].filter(Boolean).join('\n') }, { transaction });
  return [200, await Compra.findByPk(purchase.id_compra, { include: purchaseInclude, transaction })];
});

// ---------- Cotizaciones ----------
const OPEN_STATES = ['borrador', 'enviada', 'aprobada'];
const TRANSITIONS = { borrador: ['enviada', 'rechazada'], enviada: ['aprobada', 'rechazada', 'borrador'], aprobada: ['enviada', 'rechazada'], rechazada: [], vencida: [], convertida: [] };
const expiresAt = quote => new Date(new Date(quote.creado_en).getTime() + Number(quote.vigencia_dias) * 86400000);
const isExpired = quote => OPEN_STATES.includes(quote.estado) && expiresAt(quote) < new Date();
const quoteJson = quote => ({ ...quote.toJSON(), vence_en: expiresAt(quote).toISOString(), transiciones: TRANSITIONS[quote.estado] || [] });
const expireDue = async (req, transaction) => {
  const open = await Cotizacion.findAll({ where: { ...scopeWhere(req), estado: OPEN_STATES }, transaction });
  const due = open.filter(isExpired).map(q => q.id_cotizacion);
  if (due.length) await Cotizacion.update({ estado: 'vencida' }, { where: { id_cotizacion: due }, transaction });
};

exports.listQuotes = safe(async (req, res) => {
  await expireDue(req);
  const quotes = await Cotizacion.findAll({ where: scopeWhere(req), include: [{ model: CotizacionDetalle, as: 'detalles' }], order: [['creado_en', 'DESC']] });
  res.json(quotes.map(quoteJson));
});
exports.createQuote = inTransaction(async (req, res, transaction) => {
  const cliente = String(req.body.cliente_nombre || '').trim();
  if (!cliente) throw fail('Cliente obligatorio');
  if (!Array.isArray(req.body.items) || !req.body.items.length) throw fail('Agrega productos');
  const email = String(req.body.cliente_email || '').trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail('Correo del cliente inválido');
  const vigencia = Number(req.body.vigencia_dias ?? 7);
  if (!Number.isInteger(vigencia) || vigencia < 1 || vigencia > 90) throw fail('La vigencia debe ser de 1 a 90 días');
  const estado = req.body.estado || 'borrador';
  if (!['borrador', 'enviada'].includes(estado)) throw fail('Una cotización nueva solo puede crearse como borrador o enviada');
  const lines = []; const seen = new Set();
  for (const item of req.body.items) {
    const p = await productFor(req, item.producto_id, transaction);
    if (seen.has(p.id_producto)) throw fail(`${p.nombre} está repetido: suma las cantidades en una sola línea`);
    seen.add(p.id_producto);
    const q = positiveInt(item.cantidad, 'La cantidad');
    if (q > Number(p.stock)) throw fail(`Stock insuficiente para ${p.nombre} (disponible: ${p.stock})`);
    const price = positive(item.precio_unitario || p.precio_unitario_con_igv, 'Precio');
    lines.push({ p, q, price, cost: Number(p.costo_promedio || 0) });
  }
  const subtotal = round2(lines.reduce((s, i) => s + i.q * i.price, 0));
  const discount = round2(Number(req.body.descuento || 0));
  if (!Number.isFinite(discount) || discount < 0) throw fail('El descuento no puede ser negativo');
  if (discount >= subtotal) throw fail('El descuento debe ser menor que el subtotal');
  const total = round2(subtotal - discount);
  const cost = round2(lines.reduce((s, i) => s + i.q * i.cost, 0));
  const quote = await Cotizacion.create({ numero: nextNumber('COT'), cliente_nombre: cliente, cliente_documento: String(req.body.cliente_documento || '').trim() || null, cliente_email: email, cliente_telefono: String(req.body.cliente_telefono || '').trim() || null, escenario: req.body.escenario || 'personalizada', vigencia_dias: vigencia, subtotal, descuento: discount, total, costo_total: cost, margen: round2(net(total) - cost), estado, notas: req.body.notas || null, creado_por: req.user.id_user, affiliate_business_id: businessId(req) }, { transaction });
  await CotizacionDetalle.bulkCreate(lines.map(i => ({ cotizacion_id: quote.id_cotizacion, producto_id: i.p.id_producto, descripcion: i.p.nombre, cantidad: i.q, precio_unitario: i.price, costo_unitario: i.cost, subtotal: round2(i.q * i.price) })), { transaction });
  const created = await Cotizacion.findByPk(quote.id_cotizacion, { include: [{ model: CotizacionDetalle, as: 'detalles' }], transaction });
  return [201, quoteJson(created)];
});
exports.updateQuoteStatus = inTransaction(async (req, res, transaction) => {
  const quote = await Cotizacion.findOne({ where: { id_cotizacion: req.params.id, ...scopeWhere(req) }, transaction, lock: transaction.LOCK.UPDATE });
  if (!quote) throw fail('Cotización no encontrada', 404);
  const target = req.body.estado;
  if (!Object.keys(TRANSITIONS).includes(target) || target === 'convertida' || target === 'vencida') throw fail('Estado inválido', 422);
  if (isExpired(quote) && target !== 'rechazada') { await quote.update({ estado: 'vencida' }, { transaction }); throw fail('La cotización venció; crea una nueva con precios actualizados', 409); }
  if (!(TRANSITIONS[quote.estado] || []).includes(target)) throw fail(`No se puede pasar de «${quote.estado}» a «${target}»`, 409);
  await quote.update({ estado: target }, { transaction });
  return [200, quoteJson(quote)];
});
exports.convertQuote = inTransaction(async (req, res, transaction) => {
  const quote = await Cotizacion.findOne({ where: { id_cotizacion: req.params.id, ...scopeWhere(req) }, include: [{ model: CotizacionDetalle, as: 'detalles' }], transaction, lock: transaction.LOCK.UPDATE });
  if (!quote) throw fail('Cotización no encontrada', 404);
  if (!['aprobada', 'enviada'].includes(quote.estado)) throw fail('La cotización debe estar enviada o aprobada', 409);
  if (isExpired(quote)) throw fail('La cotización venció; crea una nueva con precios y stock actuales', 409);
  const metodo = String(req.body.metodo_pago || 'efectivo');
  if (!['efectivo', 'tarjeta', 'transferencia', 'yape', 'plin'].includes(metodo)) throw fail('Método de pago inválido');
  const products = [];
  for (const line of quote.detalles) {
    if (!line.producto_id) continue;
    const product = await productFor(req, line.producto_id, transaction);
    if (Number(product.stock) < Number(line.cantidad)) throw fail(`Stock insuficiente para ${product.nombre} (disponible: ${product.stock})`, 409);
    products.push({ line, product });
  }
  const total = round2(quote.total); const subtotal = round2(quote.subtotal); const discount = round2(quote.descuento);
  // El descuento se reparte en las lineas para que el detalle sume exactamente el total de la venta
  const factor = subtotal > 0 ? total / subtotal : 1;
  let assigned = 0;
  const priced = products.map(({ line, product }, idx) => {
    const lineTotal = idx === products.length - 1 ? round2(total - assigned) : round2(Number(line.subtotal) * factor);
    assigned = round2(assigned + lineTotal);
    return { line, product, lineTotal };
  });
  const sale = await Venta.scope('allBusinesses').create({ total: net(total), total_con_igv: total, id_cajero: req.user.id_user, metodo_pago: metodo, observaciones: `Convertida desde ${quote.numero}`, tipo_documento: '0', cliente_nombre: quote.cliente_nombre, cliente_numero_documento: quote.cliente_documento, cliente_email: quote.cliente_email, tipo_vendedor_snapshot: req.user.tipo_vendedor || 'interno', affiliate_business_id: businessId(req), neto_vendedor: total, es_descuento: discount > 0, descuento: discount > 0 ? round2((discount / subtotal) * 100) : null }, { transaction });
  for (const { line, product, lineTotal } of priced) {
    const qty = Number(line.cantidad);
    const unit = round2(lineTotal / qty);
    await DetalleVenta.create({ venta_id: sale.venta_id, producto_id: product.id_producto, cantidad: qty, precio_unitario: net(unit), precio_unitario_con_igv: unit, subtotal: net(lineTotal), subtotal_con_igv: lineTotal, descripcion: line.descripcion, condicion: product.condicion, garantia_meses: product.garantia_meses, estado_observaciones: product.estado_observaciones }, { transaction });
    await aplicarMovimiento({ productoId: product.id_producto, delta: -qty, tipo: 'venta', referenciaTipo: 'venta', referenciaId: sale.venta_id, motivo: `Cotización ${quote.numero}`, usuarioId: req.user.id_user, affiliateBusinessId: businessId(req), costoUnitario: product.costo_promedio, transaction });
  }
  await quote.update({ estado: 'convertida', notas: [quote.notas, `Venta #${sale.venta_id}`].filter(Boolean).join('\n') }, { transaction });
  return [200, { venta_id: sale.venta_id, cotizacion: quote.numero }];
});
