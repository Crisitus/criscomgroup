'use strict';
jest.mock('axios', () => ({ get: jest.fn(), create: jest.fn(() => ({ post: jest.fn(), get: jest.fn() })) }));
const axios = require('axios');
const shipping = require('../../src/services/shipping-quote.service');

describe('Cotizador de delivery', () => {
  beforeEach(() => axios.get.mockReset());

  it('cobra S/0 por recojo y S/30 interprovincial', async () => {
    await expect(shipping.quote({ tipo_entrega: 'recojo_tienda' })).resolves.toMatchObject({ amount: 0 });
    await expect(shipping.quote({ tipo_entrega: 'domicilio', direccion_departamento: 'Puno', direccion_provincia: 'San Román' })).resolves.toMatchObject({ amount: 30 });
  });

  it('calcula Arequipa por ruta: S/7 hasta 5 km y S/3 por km adicional', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ lat: '-16.40', lon: '-71.54' }] })
      .mockResolvedValueOnce({ data: { routes: [{ distance: 4000 }] } });
    const near = await shipping.quote({ tipo_entrega: 'domicilio', direccion_envio: 'Calle Cercana 101', direccion_distrito: 'Cercado', direccion_provincia: 'Arequipa', direccion_departamento: 'Arequipa' });
    expect(near).toMatchObject({ amount: 7, zone: 'arequipa_centro', distance_km: 4 });
    expect(axios.get.mock.calls[1][0]).toContain('-71.5299283,-16.4017578');

    axios.get.mockResolvedValueOnce({ data: [{ lat: '-16.45', lon: '-71.58' }] })
      .mockResolvedValueOnce({ data: { routes: [{ distance: 10000 }] } });
    const far = await shipping.quote({ tipo_entrega: 'domicilio', direccion_envio: 'Avenida Lejana 202', direccion_distrito: 'Socabaya', direccion_provincia: 'Arequipa', direccion_departamento: 'Arequipa' });
    expect(far).toMatchObject({ amount: 22, zone: 'arequipa_distancia', distance_km: 10 });
  });

  it('calcula Lima por ruta: S/10 hasta 5 km y tarifa creciente después', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ lat: '-12.05', lon: '-77.04' }] })
      .mockResolvedValueOnce({ data: { routes: [{ distance: 4000 }] } });
    const near = await shipping.quote({ tipo_entrega: 'domicilio', direccion_envio: 'Jr. Cercano 1', direccion_distrito: 'Lima', direccion_provincia: 'Lima', direccion_departamento: 'Lima' });
    expect(near.amount).toBe(10);
    expect(axios.get.mock.calls[1][0]).toContain('-77.0386473,-12.0555678');

    axios.get.mockResolvedValueOnce({ data: [{ lat: '-12.10', lon: '-77.10' }] })
      .mockResolvedValueOnce({ data: { routes: [{ distance: 10000 }] } });
    const far = await shipping.quote({ tipo_entrega: 'domicilio', direccion_envio: 'Av. Lejana 999', direccion_distrito: 'Lima', direccion_provincia: 'Lima', direccion_departamento: 'Lima' });
    expect(far.amount).toBe(45);
    expect(far.distance_km).toBe(10);
  });
});
