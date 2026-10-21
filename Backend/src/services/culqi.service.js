const axios = require('axios');
const gateways = require('./payment-gateway.service');

const culqiClient = axios.create({ baseURL: process.env.CULQI_API_URL || 'https://api.culqi.com/v2', timeout: 20000 });
const credentials = async () => {
  const stored = await gateways.getActiveCredentials('culqi').catch(() => null);
  return { publicKey: stored?.public_key || process.env.CULQI_PUBLIC_KEY || null, secretKey: stored?.secret_key || process.env.CULQI_SECRET_KEY || null };
};
const isConfigured = async () => { const value = await credentials(); return Boolean(value.secretKey && value.publicKey); };
const publicKey = async () => (await credentials()).publicKey;

const createCharge = async ({ token, amount, email, orderNumber, idempotencyKey }) => {
  const config = await credentials();
  if (!config.secretKey || !config.publicKey) {
    if (process.env.PAYMENTS_MODE === 'sandbox') return { id: `chr_test_${Date.now()}`, amount, currency_code: 'PEN', outcome: { type: 'venta_exitosa' }, source: { last_four: '4242' }, metadata: { order_number: orderNumber }, test: true };
    throw new Error('Culqi no está configurado');
  }
  const response = await culqiClient.post('/charges', { amount, currency_code: 'PEN', email, source_id: token, capture: true, description: `Pedido ${orderNumber}`, metadata: { order_number: orderNumber } }, { headers: { Authorization: `Bearer ${config.secretKey}`, 'Idempotency-Key': idempotencyKey, 'Content-Type': 'application/json' } });
  return response.data;
};
const retrieveCharge = async chargeId => {
  const config = await credentials();
  if (!config.secretKey || !config.publicKey) throw new Error('Culqi no está configurado');
  const response = await culqiClient.get(`/charges/${encodeURIComponent(chargeId)}`, { headers: { Authorization: `Bearer ${config.secretKey}` } });
  return response.data;
};
const sanitizeCharge = charge => ({ id: charge.id, outcome: charge.outcome?.type || null, last_four: charge.source?.last_four || null, card_brand: charge.source?.iin?.card_brand || null, test: Boolean(charge.test) });

module.exports = { createCharge, retrieveCharge, sanitizeCharge, isConfigured, publicKey };
