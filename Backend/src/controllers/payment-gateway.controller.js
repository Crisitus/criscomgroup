const PaymentGateway = require('../models/payment_gateway.model');
const gatewayService = require('../services/payment-gateway.service');
const { sequelize } = require('../config/database');

const CONFIRM_WORD = 'PRODUCCION';
const WEBHOOKS = { culqi: '/api/pedidos/webhooks/culqi' };
const fail = (res, status, message, extra = {}) => res.status(status).json({ message, ...extra });
const safe = (fn, label) => async (req, res) => {
  try { await fn(req, res); } catch (error) {
    console.error(`[payment-gateway] ${label}:`, error);
    if (!res.headersSent) fail(res, 500, 'Error en el servidor al procesar la pasarela');
  }
};
const normalizeWord = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();

// Nunca devuelve credenciales; si no se pueden descifrar lo indica sin tumbar el listado.
const serialize = item => {
  const definition = gatewayService.PROVIDERS[item.provider];
  let credentials = {};
  let credentialsError = false;
  try { credentials = gatewayService.decrypt(item.credentials_encrypted); } catch { credentialsError = true; }
  const integrated = Boolean(definition.integrated);
  return {
    id_gateway: item.id_gateway,
    provider: item.provider,
    name: definition.name,
    mode: item.mode,
    enabled: item.enabled,
    is_default: item.is_default,
    integrated,
    en_uso: integrated && item.enabled && item.connection_status === 'connected',
    connection_status: item.connection_status,
    connection_message: item.connection_message,
    last_checked_at: item.last_checked_at,
    configured_fields: gatewayService.masked(credentials),
    credentials_error: credentialsError,
    webhook_url: WEBHOOKS[item.provider] || null,
  };
};
// Reemplaza las credenciales del body por marcas para que la auditoria no las guarde.
const redactCredentials = req => {
  const incoming = req.body?.credentials && typeof req.body.credentials === 'object' ? req.body.credentials : {};
  req.body = { ...req.body, credentials: Object.fromEntries(Object.keys(incoming).map(key => [key, '[REDACTADO]'])) };
  return incoming;
};
const warnings = () => (process.env.PAYMENT_CREDENTIALS_KEY ? [] : ['Las credenciales se cifran con JWT_SECRET porque falta PAYMENT_CREDENTIALS_KEY: rotar JWT_SECRET las volvería ilegibles.']);

exports.catalog = (_req, res) => res.json({ providers: Object.entries(gatewayService.PROVIDERS).map(([provider, value]) => ({ provider, ...value })) });

exports.list = safe(async (_req, res) => {
  const items = await PaymentGateway.findAll({ order: [['id_gateway', 'ASC']] });
  res.json({ gateways: items.map(serialize), advertencias: warnings() });
}, 'listar');

const keyErrors = (provider, credentials, mode) => {
  if (provider !== 'culqi') return {};
  const errores = {};
  const tag = mode === 'production' ? 'live' : 'test';
  if (credentials.public_key && !new RegExp(`^pk_${tag}_`).test(credentials.public_key)) errores.public_key = `La llave pública debe empezar con pk_${tag}_ en este entorno`;
  if (credentials.secret_key && !new RegExp(`^sk_${tag}_`).test(credentials.secret_key)) errores.secret_key = `La llave secreta debe empezar con sk_${tag}_ en este entorno`;
  return errores;
};

exports.save = safe(async (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  const definition = gatewayService.PROVIDERS[provider];
  if (!definition) return fail(res, 404, 'Pasarela no soportada');
  const incoming = redactCredentials(req);
  const rawMode = req.body.mode;
  if (rawMode !== undefined && !['test', 'production'].includes(rawMode)) return fail(res, 422, 'El entorno debe ser test o production', { errores: { mode: 'Entorno no válido' } });
  const current = await PaymentGateway.findOne({ where: { provider } });
  let previous = {};
  if (current) { try { previous = gatewayService.decrypt(current.credentials_encrypted); } catch { return fail(res, 409, 'Las credenciales guardadas no se pueden descifrar: vuelve a ingresarlas completas', { credentials_error: true }); } }
  // Solo campos del proveedor; un valor vacio conserva el anterior.
  const clean = {};
  for (const field of definition.fields) {
    const value = String(incoming[field] ?? '').trim();
    if (value) clean[field] = value;
  }
  const credentials = { ...previous, ...clean };
  const mode = rawMode || current?.mode || 'test';
  const missing = gatewayService.missingFields(provider, credentials);
  if (missing.length) return fail(res, 422, `Faltan credenciales: ${missing.join(', ')}`, { errores: Object.fromEntries(missing.map(field => [field, 'Requerido'])) });
  const errores = keyErrors(provider, credentials, mode);
  if (Object.keys(errores).length) return fail(res, 422, 'Las llaves no corresponden al entorno elegido', { errores });
  const credentialsChanged = JSON.stringify(credentials) !== JSON.stringify(previous);
  const modeChanged = !current || current.mode !== mode;
  if (mode === 'production' && modeChanged && normalizeWord(req.body.confirmar_produccion) !== CONFIRM_WORD) {
    return fail(res, 409, 'Pasar a producción activa cobros reales. Escribe PRODUCCIÓN para confirmar.', { requiere_confirmacion: true, confirmacion_esperada: 'PRODUCCIÓN' });
  }
  if (current && !credentialsChanged && !modeChanged) return res.json({ gateway: serialize(current), sin_cambios: true });
  const values = {
    provider, mode, credentials_encrypted: gatewayService.encrypt(credentials), updated_by: req.user.id,
    // Cambiar llaves o entorno invalida la prueba anterior: la pasarela deja de usarse hasta probarla y activarla de nuevo.
    enabled: false, is_default: false, connection_status: 'saved',
    connection_message: 'Credenciales guardadas. Prueba la conexión y vuelve a activarla.',
  };
  await PaymentGateway.upsert(values);
  const item = await PaymentGateway.findOne({ where: { provider } });
  res.json({ gateway: serialize(item) });
}, 'guardar');

exports.test = safe(async (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  if (!gatewayService.PROVIDERS[provider]) return fail(res, 404, 'Pasarela no soportada');
  const item = await PaymentGateway.findOne({ where: { provider } });
  if (!item) return fail(res, 404, 'Primero guarda las credenciales');
  let credentials;
  try { credentials = gatewayService.decrypt(item.credentials_encrypted); } catch { return fail(res, 409, 'Las credenciales guardadas no se pueden descifrar: vuelve a ingresarlas', { credentials_error: true, gateway: serialize(item) }); }
  try {
    const result = await gatewayService.testConnection(provider, item.mode, credentials);
    await item.update({ connection_status: result.status, connection_message: result.message, last_checked_at: new Date() });
    return res.json({ gateway: serialize(item) });
  } catch (error) {
    const detail = String(error.response?.data?.merchant_message || error.response?.data?.user_message || error.response?.data?.message || error.response?.data?.error || error.message || 'Sin detalle').slice(0, 300);
    if (gatewayService.isTransientError(error)) {
      // Fallo de red o de la pasarela: no prueba que las llaves sean malas, asi que no se desactiva nada.
      return fail(res, 502, 'No se pudo contactar a la pasarela. Tu configuración no se modificó; vuelve a intentarlo.', { transitorio: true, detail, gateway: serialize(item) });
    }
    await item.update({ connection_status: 'error', connection_message: detail.slice(0, 500), last_checked_at: new Date(), enabled: false, is_default: false });
    return fail(res, 422, 'La pasarela rechazó las credenciales', { detail, gateway: serialize(item) });
  }
}, 'probar');

// Activa la pasarela para los cobros web. Solo existe flujo de cobro para proveedores integrados (hoy Culqi).
exports.setDefault = safe(async (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  const definition = gatewayService.PROVIDERS[provider];
  if (!definition) return fail(res, 404, 'Pasarela no soportada');
  if (!definition.integrated) return fail(res, 422, `${definition.name} está en preparación: todavía no existe flujo de cobro para activarla`);
  const transaction = await sequelize.transaction();
  try {
    const item = await PaymentGateway.findOne({ where: { provider }, transaction, lock: transaction.LOCK.UPDATE });
    if (!item || item.connection_status !== 'connected') { await transaction.rollback(); return fail(res, 422, 'Solo una pasarela conectada puede dirigir los cobros'); }
    await PaymentGateway.update({ is_default: false }, { where: {}, transaction });
    await item.update({ is_default: true, enabled: true, updated_by: req.user.id }, { transaction });
    await transaction.commit();
    return res.json({ gateway: serialize(item) });
  } catch (error) { await transaction.rollback().catch(() => {}); throw error; }
}, 'activar');

exports.clearDefault = safe(async (req, res) => {
  const provider = String(req.params.provider || '').toLowerCase();
  if (!gatewayService.PROVIDERS[provider]) return fail(res, 404, 'Pasarela no soportada');
  const item = await PaymentGateway.findOne({ where: { provider } });
  if (!item) return fail(res, 404, 'Primero guarda las credenciales');
  await item.update({ is_default: false, enabled: false, updated_by: req.user.id });
  res.json({ gateway: serialize(item) });
}, 'desactivar');
