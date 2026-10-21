'use strict';
// ecom-logica T2: vigencia opcional de ofertas (tabla ofertas = fuente de verdad;
// producto.es_oferta/precio_oferta = caché write-through de ofertas vigentes).
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { Oferta } = require('../../src/models');

const AHORA = Date.now();
const DIA = 24 * 60 * 60 * 1000;
const iso = (ms) => new Date(ms).toISOString();

describe('ofertas: vigencia opcional (ecom T2)', () => {
  let auth;
  const mk = (sku, normal = 100) => createProducto({ sku, nombre: sku, precio_unitario: Number((normal / 1.18).toFixed(2)), precio_unitario_con_igv: normal });

  beforeAll(async () => {
    await setupTestDb();
    const admin = await createUser({ name: 'seed-ecom Ofertas', email: 'seed-ecom-vigencia@test.local', password: 'Clave123!', id_role: 1 });
    auth = { Authorization: `Bearer ${getAuthToken(admin)}` };
  });

  const idsEnEcommerce = async () => {
    const res = await request(app).get('/api/ecommerce/ofertas');
    expect(res.statusCode).toBe(200);
    return res.body.map((p) => p.id_producto);
  };

  it('vigente (desde ayer, hasta mañana): aparece y marca el caché', async () => {
    const p = await mk('seed-ecom-VIG');
    await request(app).put('/api/ofertas-del-dia').set(auth).send({
      id_producto: p.id_producto, descuento: 10,
      vigente_desde: iso(AHORA - DIA), vigente_hasta: iso(AHORA + DIA),
    }).expect(200);
    await p.reload();
    expect(p.es_oferta).toBeTruthy();
    expect(Number(p.precio_oferta_con_igv)).toBe(90);
    expect(await idsEnEcommerce()).toContain(p.id_producto);
    const fila = await Oferta.findOne({ where: { id_producto: p.id_producto } });
    expect(fila.vigente_desde).toBeTruthy();
    expect(fila.vigente_hasta).toBeTruthy();
  });

  it('futura (desde mañana): la fila existe pero el caché queda limpio y no se expone', async () => {
    const p = await mk('seed-ecom-FUT');
    await request(app).put('/api/ofertas-del-dia').set(auth).send({
      id_producto: p.id_producto, descuento: 20,
      vigente_desde: iso(AHORA + DIA), vigente_hasta: iso(AHORA + 2 * DIA),
    }).expect(200);
    await p.reload();
    expect(p.es_oferta).toBeFalsy();
    expect(p.precio_oferta_con_igv).toBeNull();
    expect(await Oferta.count({ where: { id_producto: p.id_producto } })).toBe(1);
    expect(await idsEnEcommerce()).not.toContain(p.id_producto);
  });

  it('vencida: la lectura pública limpia el caché (write-through al vencer)', async () => {
    const p = await mk('seed-ecom-VENC');
    await request(app).put('/api/ofertas-del-dia').set(auth).send({ id_producto: p.id_producto, descuento: 15 }).expect(200);
    await p.reload();
    expect(p.es_oferta).toBeTruthy();
    // Forzar vencimiento directo en la fuente de verdad
    await Oferta.update({ vigente_hasta: iso(AHORA - DIA) }, { where: { id_producto: p.id_producto } });
    expect(await idsEnEcommerce()).not.toContain(p.id_producto);
    await p.reload();
    expect(p.es_oferta).toBeFalsy();
    expect(p.precio_oferta_con_igv).toBeNull();
  });

  it('NULL = sin vencimiento: vigente y visible', async () => {
    const p = await mk('seed-ecom-NULL');
    await request(app).put('/api/ofertas-del-dia').set(auth).send({ id_producto: p.id_producto, descuento: 25 }).expect(200);
    await p.reload();
    expect(p.es_oferta).toBeTruthy();
    const fila = await Oferta.findOne({ where: { id_producto: p.id_producto } });
    expect(fila.vigente_desde).toBeNull();
    expect(fila.vigente_hasta).toBeNull();
    expect(await idsEnEcommerce()).toContain(p.id_producto);
  });

  it('rechaza vigencia inválida (desde > hasta, fecha rota) sin aplicar nada', async () => {
    const p = await mk('seed-ecom-BADV');
    const r1 = await request(app).put('/api/ofertas-del-dia').set(auth).send({
      id_producto: p.id_producto, descuento: 10,
      vigente_desde: iso(AHORA + DIA), vigente_hasta: iso(AHORA - DIA),
    }).expect(422);
    expect(r1.body.errores[0].motivo).toMatch(/vigente_desde/);
    await request(app).put('/api/ofertas-del-dia').set(auth).send({
      id_producto: p.id_producto, descuento: 10, vigente_desde: 'no-es-fecha',
    }).expect(422);
    await p.reload();
    expect(p.es_oferta).toBeFalsy();
    expect(await Oferta.count({ where: { id_producto: p.id_producto } })).toBe(0);
  });

  it('GET /api/ofertas-del-dia (admin) expone vigencia y flag vigente', async () => {
    const p = await mk('seed-ecom-ADM');
    await request(app).put('/api/ofertas-del-dia').set(auth).send({
      id_producto: p.id_producto, descuento: 10, vigente_hasta: iso(AHORA + DIA),
    }).expect(200);
    const res = await request(app).get('/api/ofertas-del-dia').set(auth).expect(200);
    const fila = res.body.find((o) => o.id_producto === p.id_producto);
    expect(fila).toBeTruthy();
    expect(fila.vigente).toBe(true);
    expect(fila.vigente_hasta).toBeTruthy();
    expect(fila).not.toHaveProperty('precio_oferta');
  });
});
