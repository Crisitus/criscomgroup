const { sequelize, AdquisicionUsado, Producto, MovimientoInventario } = require('../models');

const numberOrNull = value => value === '' || value === null || value === undefined ? null : Number(value);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const componentTypes = ['equipo_completo', 'ssd', 'hdd', 'bateria', 'ram', 'gpu', 'cpu', 'placa_madre', 'otro'];
const testResults = ['pendiente', 'aprobado', 'observado', 'rechazado'];
const numericFields = ['smart_salud_porcentaje', 'tbw_escrito', 'tbw_nominal', 'horas_encendido', 'ciclos_encendido', 'ciclos_bateria', 'capacidad_bateria_diseno', 'capacidad_bateria_actual'];
const writableFields = ['producto_id', 'tipo_operacion', 'transferente_tipo_documento', 'transferente_numero_documento', 'transferente_nombre', 'transferente_contacto', 'declaracion_no_habitual', 'formulario_820', 'monto_adquisicion', 'medio_pago', 'referencia_pago', 'marca', 'modelo', 'numero_serie', 'tipo_componente', 'capacidad', 'estado_recepcion', 'accesorios', 'procedencia_declarada', 'declaracion_propiedad', 'documento_privado_path', 'fecha_adquisicion', 'prueba_funcional', 'observaciones_tecnicas', ...numericFields];

const evaluate = body => {
  let score = 100;
  const alerts = [];
  const metrics = {};
  const health = numberOrNull(body.smart_salud_porcentaje);
  if (health !== null) {
    metrics.smart_salud = clamp(health, 0, 100);
    score -= (100 - metrics.smart_salud) * 0.55;
    if (health < 80) alerts.push('Salud SMART menor a 80%');
  }
  const written = numberOrNull(body.tbw_escrito);
  const rated = numberOrNull(body.tbw_nominal);
  if (written !== null && rated) {
    metrics.desgaste_tbw_porcentaje = clamp((written / rated) * 100, 0, 999);
    score -= clamp(metrics.desgaste_tbw_porcentaje, 0, 100) * 0.25;
    if (metrics.desgaste_tbw_porcentaje >= 80) alerts.push('SSD cerca o por encima de su TBW nominal');
  }
  const design = numberOrNull(body.capacidad_bateria_diseno);
  const current = numberOrNull(body.capacidad_bateria_actual);
  if (design && current !== null) {
    metrics.salud_bateria_porcentaje = clamp((current / design) * 100, 0, 100);
    score -= (100 - metrics.salud_bateria_porcentaje) * 0.35;
    if (metrics.salud_bateria_porcentaje < 70) alerts.push('Batería con menos de 70% de capacidad original');
  }
  const batteryCycles = numberOrNull(body.ciclos_bateria);
  if (batteryCycles !== null && batteryCycles > 500) score -= clamp((batteryCycles - 500) / 50, 0, 10);
  const test = body.prueba_funcional || 'pendiente';
  if (test === 'observado') score -= 18;
  if (test === 'rechazado') { score = Math.min(score, 25); alerts.push('Prueba funcional rechazada'); }
  if (test === 'pendiente') { score = Math.min(score, 69); alerts.push('Evaluación provisional: falta prueba funcional'); }
  score = Number(clamp(score, 0, 100).toFixed(2));
  const grade = test === 'rechazado' ? 'defectuoso' : score >= 90 ? 'A' : score >= 78 ? 'B' : score >= 65 ? 'C' : score >= 45 ? 'D' : 'defectuoso';
  return { score, grade, metrics, alerts, version: 1 };
};

const validateTechnical = body => {
  if (!componentTypes.includes(body.tipo_componente || 'equipo_completo')) throw new Error('Tipo de componente inválido');
  if (!testResults.includes(body.prueba_funcional || 'pendiente')) throw new Error('Resultado de prueba funcional inválido');
  const percentage = numberOrNull(body.smart_salud_porcentaje);
  if (percentage !== null && (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)) throw new Error('La salud SMART debe estar entre 0 y 100');
  for (const key of numericFields.filter(key => key !== 'smart_salud_porcentaje')) {
    const value = numberOrNull(body[key]);
    if (value !== null && (!Number.isFinite(value) || value < 0)) throw new Error(`${key} debe ser un número no negativo`);
    if (value !== null && ['horas_encendido', 'ciclos_encendido', 'ciclos_bateria', 'capacidad_bateria_diseno', 'capacidad_bateria_actual'].includes(key) && !Number.isInteger(value)) throw new Error(`${key} debe ser un número entero`);
  }
  if (body.tbw_nominal !== '' && numberOrNull(body.tbw_nominal) !== null && numberOrNull(body.tbw_nominal) <= 0) throw new Error('El TBW nominal debe ser mayor que cero');
  if (body.capacidad_bateria_diseno !== '' && numberOrNull(body.capacidad_bateria_diseno) !== null && numberOrNull(body.capacidad_bateria_diseno) <= 0) throw new Error('La capacidad de diseño debe ser mayor que cero');
};

const validate = body => {
  const allowed = ['compra', 'donacion_real', 'cesion_gratuita'];
  if (!allowed.includes(body.tipo_operacion)) throw new Error('Tipo de operación inválido');
  const amount = Number(body.monto_adquisicion || 0);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('El monto de adquisición debe ser un número no negativo');
  if (body.tipo_operacion === 'compra' && amount <= 0) throw new Error('Una compra debe registrar el monto realmente pagado');
  if (body.tipo_operacion !== 'compra' && amount !== 0) throw new Error('Una donación o cesión gratuita debe tener monto cero');
  if (!body.declaracion_propiedad) throw new Error('Se requiere la declaración de propiedad y procedencia');
  if (!body.numero_serie || !body.estado_recepcion || !body.procedencia_declarada) throw new Error('Faltan datos de trazabilidad del equipo');
  validateTechnical(body);
};

const normalized = (body, userId) => {
  const result = evaluate(body);
  const safeBody = Object.fromEntries(writableFields.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
  if (safeBody.producto_id !== undefined) safeBody.producto_id = Number(safeBody.producto_id) || null;
  return {
    ...safeBody,
    monto_adquisicion: Number(body.monto_adquisicion || 0),
    ...Object.fromEntries(numericFields.map(key => [key, numberOrNull(body[key])])),
    grado_evaluacion: result.grade,
    puntaje_evaluacion: result.score,
    evaluacion_detalle: result,
    ...(userId ? { recibido_por: userId } : {}),
  };
};

exports.list = async (_req, res) => res.json(await AdquisicionUsado.findAll({ include: [{ model: Producto.scope('allBusinesses'), as: 'producto', required: false, attributes: ['id_producto', 'nombre', 'sku', 'condicion', 'stock'] }], order: [['fecha_adquisicion', 'DESC']] }));

const registerInventory = async (record, userId, transaction) => {
  if (!record.producto_id || record.inventario_registrado_en) return;
  if (!['aprobado', 'observado'].includes(record.prueba_funcional)) throw new Error('Solo una unidad aprobada u observada puede ingresar al stock disponible');
  const product = await Producto.findByPk(record.producto_id, { transaction, lock: transaction.LOCK.UPDATE });
  if (!product) throw new Error('Producto de inventario no encontrado');
  // Un equipo usado no puede mezclarse con stock nuevo: se venderia como nuevo o se marcaria todo como usado
  if (product.condicion !== 'segunda_mano' && Number(product.stock) > 0) {
    throw new Error(`«${product.nombre}» es un producto nuevo con ${product.stock} unidades en stock. Elige o crea un producto de segunda mano para este equipo.`);
  }
  const oldStock = Number(product.stock);
  const newStock = oldStock + 1;
  const unitCost = Number(record.monto_adquisicion || 0);
  const oldCost = Number(product.costo_promedio || 0);
  const weightedCost = ((oldStock * oldCost) + unitCost) / newStock;
  await product.update({ stock: newStock, condicion: 'segunda_mano', ultimo_costo: unitCost, costo_promedio: weightedCost }, { transaction });
  await MovimientoInventario.create({ producto_id: product.id_producto, tipo: 'compra', cantidad: 1, stock_anterior: oldStock, stock_nuevo: newStock, costo_unitario: unitCost, referencia_tipo: 'adquisicion_usado', referencia_id: record.id_adquisicion, motivo: `Segunda mano · serie ${record.numero_serie}`, usuario_id: userId, affiliate_business_id: null }, { transaction });
  await record.update({ inventario_registrado_en: new Date() }, { transaction });
};

exports.create = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    validate(req.body);
    const record = await AdquisicionUsado.create(normalized(req.body, req.user.id_user), { transaction });
    if (req.body.registrar_inventario !== false) await registerInventory(record, req.user.id_user, transaction);
    await transaction.commit();
    res.status(201).json({ success: true, adquisicion: record });
  } catch (error) { await transaction.rollback(); res.status(400).json({ success: false, message: friendly(error) }); }
};

const friendly = error => error.name === 'SequelizeUniqueConstraintError' ? 'Ya existe un expediente con ese número de serie' : error.message;

exports.update = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const record = await AdquisicionUsado.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!record) { await transaction.rollback(); return res.status(404).json({ success: false, message: 'Adquisición no encontrada' }); }
    // PUT parcial: se valida el expediente completo resultante, no solo lo enviado
    const merged = { ...record.toJSON(), ...req.body };
    if (record.inventario_registrado_en) {
      const locked = ['producto_id', 'monto_adquisicion', 'tipo_operacion', 'numero_serie'];
      const changed = locked.filter(key => req.body[key] !== undefined && String(req.body[key] ?? '') !== String(record[key] ?? ''));
      if (changed.length) throw new Error(`El equipo ya ingresó al stock: no se puede cambiar ${changed.join(', ')}`);
    }
    validate(merged);
    await record.update(normalized(merged), { transaction });
    if (req.body.registrar_inventario === true) await registerInventory(record, req.user.id_user, transaction);
    await transaction.commit();
    res.json({ success: true, adquisicion: record });
  } catch (error) { await transaction.rollback(); res.status(400).json({ success: false, message: friendly(error) }); }
};

exports.evaluate = async (req, res) => {
  try { validateTechnical(req.body); res.json({ success: true, evaluacion: evaluate(req.body) }); }
  catch (error) { res.status(400).json({ success: false, message: error.message }); }
};
