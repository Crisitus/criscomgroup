'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { Oferta } = require('../../src/models');
const { reconciliarOfertas } = require('../../src/services/ofertas.service');

describe('Ofertas: reglas de negocio corregidas', () => {
  let auth;
  const mk = (sku, normal = 100) => createProducto({ sku, nombre: sku, precio_unitario: Number((normal / 1.18).toFixed(2)), precio_unitario_con_igv: normal });
  beforeAll(async () => {
    await setupTestDb();
    const admin = await createUser({ name: 'Admin Ofertas', email: 'ofertas-logica@test.local', password: 'Clave123!', id_role: 1 });
    auth = { Authorization: `Bearer ${getAuthToken(admin)}` };
  });

  it('aplica precio_fijo exacto y deriva neto y descuento', async () => {
    const p = await mk('OF-FIJO', 100);
    const res = await request(app).put('/api/ofertas-del-dia').set(auth).send({ id_producto: p.id_producto, precio_fijo: 79.9 }).expect(200);
    expect(res.body.resultados[0]).toMatchObject({ id_producto: p.id_producto, estado: 'aplicada' });
    await p.reload();
    expect(Number(p.precio_oferta_con_igv)).toBe(79.9);
    expect(Number(p.precio_oferta)).toBeCloseTo(67.71, 2);
    expect(p.es_oferta).toBeTruthy();
    const fila = await Oferta.findOne({ where: { id_producto: p.id_producto } });
    expect(fila.descuento).toBeCloseTo(20.1, 2);
  });

  it('rechaza precio_fijo invalido (0, negativo, >= normal) y body nulo', async () => {
    const p = await mk('OF-BAD', 100);
    for (const precio_fijo of [0, -5, 100, 150, 'abc']) {
      const r = await request(app).put('/api/ofertas-del-dia').set(auth).send({ id_producto: p.id_producto, precio_fijo }).expect(422);
      expect(r.body.errores[0].estado).toBe('error');
    }
    await p.reload(); expect(p.es_oferta).toBeFalsy();
    await request(app).put('/api/ofertas-del-dia').set(auth).send([]).expect(400);
    await request(app).put('/api/ofertas-del-dia').set(auth).set('Content-Type', 'application/json').send('null').expect(400);
  });

  it('es atomico: un item malo deja todo sin aplicar y reporta por item', async () => {
    const a = await mk('OF-AT-A'); const b = await mk('OF-AT-B');
    const res = await request(app).put('/api/ofertas-del-dia').set(auth).send([
      { id_producto: a.id_producto, descuento: 10 },
      { id_producto: b.id_producto, precio_fijo: 500 },
      { id_producto: 999999, descuento: 10 }
    ]).expect(422);
    const byId = Object.fromEntries(res.body.resultados.map((r) => [r.id_producto, r.estado]));
    expect(byId[a.id_producto]).toBe('omitida');
    expect(byId[b.id_producto]).toBe('error');
    expect(byId[999999]).toBe('error');
    await a.reload(); expect(a.es_oferta).toBeFalsy();
    expect(await Oferta.count({ where: { id_producto: a.id_producto } })).toBe(0);
  });

  it('descuento porcentual sigue funcionando en lote', async () => {
    const a = await mk('OF-PCT-A'); const b = await mk('OF-PCT-B', 200);
    await request(app).put('/api/ofertas-del-dia').set(auth).send([{ id_producto: a.id_producto, descuento: 10 }, { id_producto: b.id_producto, descuento: 25 }]).expect(200);
    await b.reload(); expect(Number(b.precio_oferta_con_igv)).toBe(150);
  });

  it('DELETE limpia el producto aunque no exista fila en ofertas', async () => {
    const p = await mk('OF-DEL');
    await p.update({ es_oferta: true, precio_oferta_con_igv: 80, precio_oferta: 67.8 });
    await request(app).delete(`/api/ofertas-del-dia/${p.id_producto}`).set(auth).expect(200);
    await p.reload(); expect(p.es_oferta).toBeFalsy(); expect(p.precio_oferta_con_igv).toBeNull();
    await request(app).delete(`/api/ofertas-del-dia/${p.id_producto}`).set(auth).expect(404);
    await request(app).delete('/api/ofertas-del-dia/999999').set(auth).expect(404);
  });

  it('eliminar-lote devuelve resultado por item', async () => {
    const a = await mk('OF-LOTE-A'); const b = await mk('OF-LOTE-B'); const c = await mk('OF-LOTE-C');
    await request(app).put('/api/ofertas-del-dia').set(auth).send([{ id_producto: a.id_producto, descuento: 10 }, { id_producto: b.id_producto, descuento: 10 }]).expect(200);
    const res = await request(app).post('/api/ofertas-del-dia/eliminar-lote').set(auth).send({ ids: [a.id_producto, b.id_producto, c.id_producto, 999999] }).expect(207);
    const est = res.body.resultados.map((r) => r.estado);
    expect(est).toEqual(['aplicada', 'aplicada', 'omitida', 'error']);
    expect(await Oferta.count({ where: { id_producto: [a.id_producto, b.id_producto] } })).toBe(0);
    await request(app).post('/api/ofertas-del-dia/eliminar-lote').set(auth).send({ ids: [] }).expect(400);
  });

  it('reconciliar crea filas faltantes, limpia obsoletas y es idempotente', async () => {
    const huerfano = await mk('OF-REC-A', 100);
    await huerfano.update({ es_oferta: true, precio_oferta_con_igv: 75, precio_oferta: 63.56 });
    const roto = await mk('OF-REC-B', 100);
    await roto.update({ es_oferta: true, precio_oferta_con_igv: 150, precio_oferta: 127 });
    const sinFlag = await mk('OF-REC-C', 100);
    await Oferta.create({ id_producto: sinFlag.id_producto, descuento: 10 });
    const r1 = await reconciliarOfertas();
    expect(r1.creadas).toBeGreaterThanOrEqual(1);
    expect((await Oferta.findOne({ where: { id_producto: huerfano.id_producto } })).descuento).toBeCloseTo(25, 2);
    await roto.reload(); expect(roto.es_oferta).toBeFalsy();
    expect(await Oferta.count({ where: { id_producto: sinFlag.id_producto } })).toBe(0);
    expect(await reconciliarOfertas()).toEqual({ creadas: 0, actualizadas: 0, limpiadas: 0, huerfanasEliminadas: 0 });
  });

  it('asignar-oferta escribe tambien la fila ofertas y editar precio mantiene el descuento', async () => {
    const p = await mk('OF-ASIG', 100);
    await request(app).post('/api/productos/asignar-oferta').set(auth).send({ id_producto: p.id_producto, descuento: 20 }).expect(200);
    expect((await Oferta.findOne({ where: { id_producto: p.id_producto } })).descuento).toBeCloseTo(20, 2);
    await request(app).put(`/api/productos/${p.id_producto}`).set(auth).send({ precio_unitario_con_igv: 200, precio_unitario: 169.49 }).expect(200);
    await p.reload(); expect(Number(p.precio_oferta_con_igv)).toBeCloseTo(160, 2);
    expect((await Oferta.findOne({ where: { id_producto: p.id_producto } })).descuento).toBeCloseTo(20, 2);
  });
});
