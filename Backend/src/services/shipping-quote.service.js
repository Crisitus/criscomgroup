const axios = require('axios');

const cache = new Map();
const normalize = value => String(value || '').trim().toLocaleLowerCase('es-PE').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const roundHalf = value => Math.ceil(value * 2) / 2;

const cityConfigs = {
  lima: {
    origin: {
      // Galerías Wilson, Cercado de Lima.
      lat: Number(process.env.LIMA_DELIVERY_ORIGIN_LAT || -12.0555678),
      lon: Number(process.env.LIMA_DELIVERY_ORIGIN_LON || -77.0386473),
    },
    baseAmount: Number(process.env.LIMA_DELIVERY_BASE_AMOUNT || 10),
    includedKm: Number(process.env.LIMA_DELIVERY_INCLUDED_KM || 5),
    additionalKmAmount: Number(process.env.LIMA_DELIVERY_ADDITIONAL_KM_AMOUNT || 7),
  },
  arequipa: {
    origin: {
      // Compuplaza, Octavio Muñoz Nájar 223, Arequipa.
      lat: Number(process.env.AREQUIPA_DELIVERY_ORIGIN_LAT || -16.4017578),
      lon: Number(process.env.AREQUIPA_DELIVERY_ORIGIN_LON || -71.5299283),
    },
    baseAmount: Number(process.env.AREQUIPA_DELIVERY_BASE_AMOUNT || 7),
    includedKm: Number(process.env.AREQUIPA_DELIVERY_INCLUDED_KM || 5),
    additionalKmAmount: Number(process.env.AREQUIPA_DELIVERY_ADDITIONAL_KM_AMOUNT || 3),
  },
};

const quote = async ({ tipo_entrega, direccion_envio, direccion_distrito, direccion_provincia, direccion_departamento }) => {
  if (tipo_entrega !== 'domicilio') return { amount: 0, zone: 'recojo_tienda', distance_km: 0 };

  const department = normalize(direccion_departamento);
  const province = normalize(direccion_provincia);
  const city = department === 'lima' && province === 'lima'
    ? 'lima'
    : department === 'arequipa' && province === 'arequipa'
      ? 'arequipa'
      : null;
  if (!city) return { amount: 30, zone: 'interprovincial', distance_km: null };

  const config = cityConfigs[city];
  const cityLabel = city === 'lima' ? 'Lima' : 'Arequipa';
  const address = [direccion_envio, direccion_distrito, cityLabel, 'Peru'].filter(Boolean).join(', ');
  const key = normalize(address);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.quote;

  const geocoding = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q: address, format: 'jsonv2', limit: 1, countrycodes: 'pe' },
    headers: { 'User-Agent': 'CRISCOMGroup/1.0 delivery-quote' },
    timeout: 8000,
  });
  const destination = geocoding.data?.[0];
  if (!destination) throw new Error('No pudimos ubicar la dirección. Agrega avenida, número y distrito.');

  const route = await axios.get(`https://router.project-osrm.org/route/v1/driving/${config.origin.lon},${config.origin.lat};${destination.lon},${destination.lat}`, {
    params: { overview: 'false', alternatives: 'false', steps: 'false' },
    timeout: 8000,
  });
  const distanceKm = Number(route.data?.routes?.[0]?.distance || 0) / 1000;
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) throw new Error('No pudimos calcular una ruta de delivery para esa dirección.');

  const isBaseZone = distanceKm <= config.includedKm;
  const amount = isBaseZone
    ? config.baseAmount
    : roundHalf(config.baseAmount + (distanceKm - config.includedKm) * config.additionalKmAmount);
  const result = {
    amount,
    zone: `${city}_${isBaseZone ? 'centro' : 'distancia'}`,
    distance_km: Math.round(distanceKm * 10) / 10,
  };
  cache.set(key, { quote: result, expiresAt: Date.now() + 15 * 60 * 1000 });
  return result;
};

module.exports = { quote };
