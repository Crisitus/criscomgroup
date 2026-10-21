const crypto = require('crypto');
const axios = require('axios');

const PROVIDERS = {
  niubiz: { name: 'Niubiz', fields: ['merchant_id', 'user', 'password'], supportsApiTest: true, integrated: false },
  vendemas: { name: 'Vendemás', fields: ['merchant_id', 'integration_key'], supportsApiTest: false, integrated: false },
  culqi: { name: 'Culqi', fields: ['public_key', 'secret_key'], supportsApiTest: true, integrated: true },
  openpay: { name: 'Openpay by BBVA', fields: ['merchant_id', 'public_key', 'private_key'], supportsApiTest: true, integrated: false },
  izipay: { name: 'Izipay', fields: ['shop_id', 'username', 'password', 'hmac_key'], supportsApiTest: false, integrated: false },
};

const key = () => crypto.createHash('sha256').update(String(process.env.PAYMENT_CREDENTIALS_KEY || process.env.JWT_SECRET || '')).digest();
const encrypt = value => {
  if (!process.env.PAYMENT_CREDENTIALS_KEY && !process.env.JWT_SECRET) throw new Error('Falta PAYMENT_CREDENTIALS_KEY');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const payload = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), payload.toString('base64')].join('.');
};
const decrypt = value => {
  if (!value) return {};
  const [iv, tag, payload] = String(value).split('.').map(part => Buffer.from(part, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(payload), decipher.final()]).toString('utf8'));
};
// Muestra solo los ultimos 4 caracteres y unicamente cuando el valor es lo bastante largo para no revelarse.
const masked = credentials => Object.fromEntries(Object.entries(credentials || {}).map(([name, value]) => [name, value ? (String(value).length > 8 ? `••••${String(value).slice(-4)}` : '••••') : '']));
const missingFields = (provider, credentials) => (PROVIDERS[provider]?.fields || []).filter(field => !String(credentials?.[field] || '').trim());
// Un fallo de red o un error del lado de la pasarela NO prueba que las credenciales sean invalidas.
const isTransientError = error => !error.response || ![400, 401, 403].includes(error.response.status);
const validate = (provider, credentials) => {
  const definition = PROVIDERS[provider];
  if (!definition) throw new Error('Pasarela no soportada');
  const missing = definition.fields.filter(field => !String(credentials[field] || '').trim());
  if (missing.length) throw new Error(`Faltan credenciales: ${missing.join(', ')}`);
};
const apiBase = (provider, mode) => {
  if (provider === 'culqi') return 'https://api.culqi.com/v2';
  if (provider === 'niubiz') return mode === 'production' ? 'https://apiprod.vnforapps.com' : 'https://apitestenv.vnforapps.com';
  if (provider === 'openpay') return mode === 'production' ? 'https://api.openpay.pe' : 'https://sandbox-api.openpay.pe';
  return null;
};
const testConnection = async (provider, mode, credentials) => {
  validate(provider, credentials);
  if (provider === 'culqi') {
    await axios.get(`${apiBase(provider, mode)}/charges?limit=1`, { headers: { Authorization: `Bearer ${credentials.secret_key}` }, timeout: 15000 });
    return { status: 'connected', message: 'Llave secreta aceptada por Culqi.' };
  }
  if (provider === 'niubiz') {
    await axios.get(`${apiBase(provider, mode)}/api.security/v1/security`, { params: { merchantId: credentials.merchant_id }, headers: { Authorization: `Basic ${Buffer.from(`${credentials.user}:${credentials.password}`).toString('base64')}` }, timeout: 15000 });
    return { status: 'connected', message: 'Credenciales aceptadas por Niubiz.' };
  }
  if (provider === 'openpay') {
    await axios.get(`${apiBase(provider, mode)}/v1/${encodeURIComponent(credentials.merchant_id)}/charges`, { params: { limit: 1 }, auth: { username: credentials.private_key, password: '' }, timeout: 15000 });
    return { status: 'connected', message: 'Credenciales aceptadas por Openpay.' };
  }
  return { status: 'contract_required', message: `${PROVIDERS[provider].name} requiere la URL/SDK habilitado en tu contrato comercial. Las credenciales quedaron guardadas, pero no se marcará como conectado hasta completar esa activación.` };
};

const getActiveCredentials = async provider => {
  const PaymentGateway = require('../models/payment_gateway.model');
  const item = await PaymentGateway.findOne({ where: { provider, enabled: true, connection_status: 'connected' } });
  return item ? { ...decrypt(item.credentials_encrypted), mode: item.mode, is_default: item.is_default } : null;
};

module.exports = { PROVIDERS, encrypt, decrypt, masked, validate, missingFields, isTransientError, testConnection, getActiveCredentials };
