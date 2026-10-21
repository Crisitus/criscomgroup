'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto, createCodigoBarras } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { AuditLog, AreaGrant, Producto } = require('../../src/models');

jest.setTimeout(90000);

describe('Exportar productos / Tickets PDF: logica de backend', () => {
  let gerente, admin, vendedor, vendedorConArea, p1;
  const h = u => ({ Authorization: `Bearer ${getAuthToken(u)}` });

  beforeAll(async () => {
    await setupTestDb();
    gerente = await createUser({ name: 'Gerente', email: 'gerente-exp@test.local', password: 'Clave123!', id_role: 1 });
    admin = await createUser({ name: 'Admin', email: 'admin-exp@test.local', password: 'Clave123!', id_role: 2 });
    vendedor = await createUser({ name: 'Vendedor', email: 'vend-exp@test.local', password: 'Clave123!', id_role: 3 });
    vendedorConArea = await createUser({ name: 'Vend Inv', email: 'vendinv-exp@test.local', password: 'Clave123!', id_role: 3 });
    await AreaGrant.create({ user_id: vendedorConArea.id_user, area: 'inventario', granted_by: gerente.id_user });
    p1 = await createProducto({ sku: 'EXP-001', nombre: 'Producto export seed-adm', stock: 12 });
    await Producto.update({ costo_promedio: 40.5, ultimo_costo: 42 }, { where: { id_producto: p1.id_producto } });
    await createCodigoBarras(p1.id_producto, 'EXP-CB-2', 5);
    await createCodigoBarras(p1.id_producto, 'EXP-CB-1', 7);
  });

  describe('costos ocultos a quien no corresponde', () => {
    const buscar = body => body.find(p => p.sku === 'EXP-001');

    it('Vendedor (rol 3) no recibe costo_promedio ni ultimo_costo en el listado', async () => {
      const res = await request(app).get('/api/productos').set(h(vendedor)).expect(200);
      const p = buscar(res.body);
      expect(p).toBeDefined();
      expect(p).not.toHaveProperty('costo_promedio');
      expect(p).not.toHaveProperty('ultimo_costo');
      expect(p).toHaveProperty('precio_unitario_con_igv');
    });

    it('Vendedor no recibe costos en el detalle ni por categoria', async () => {
      const det = await request(app).get(`/api/productos/${p1.id_producto}`).set(h(vendedor)).expect(200);
      expect(det.body).not.toHaveProperty('costo_promedio');
      expect(det.body).not.toHaveProperty('ultimo_costo');
      const cat = await request(app).get(`/api/productos/categoria/${p1.id_categoria}`).set(h(vendedor)).expect(200);
      expect(cat.body[0]).not.toHaveProperty('costo_promedio');
    });

    it('Gerente, Administrador y Vendedor con permiso de inventario siguen viendo costos', async () => {
      for (const u of [gerente, admin, vendedorConArea]) {
        const res = await request(app).get('/api/productos').set(h(u)).expect(200);
        const p = buscar(res.body);
        expect(Number(p.costo_promedio)).toBe(40.5);
        expect(Number(p.ultimo_costo)).toBe(42);
      }
    });
  });

  it('el listado trae los codigos de barras de cada producto en orden estable (alta primero)', async () => {
    const res = await request(app).get('/api/productos').set(h(gerente)).expect(200);
    const p = res.body.find(x => x.sku === 'EXP-001');
    expect(p.codigos_barras.map(c => c.codigo_barras)).toEqual(['EXP-CB-2', 'EXP-CB-1']);
    expect(p.codigos_barras.map(c => c.cantidad)).toEqual([5, 7]);
  });

  describe('POST /api/productos/exportaciones/registro', () => {
    const url = '/api/productos/exportaciones/registro';

    it('exige sesion y rol 1/2', async () => {
      await request(app).post(url).send({ tipo: 'productos_excel', cantidad: 1 }).expect(401);
      await request(app).post(url).set(h(vendedor)).send({ tipo: 'productos_excel', cantidad: 1 }).expect(403);
    });

    it('valida tipo y cantidad con {message, errores}', async () => {
      const res = await request(app).post(url).set(h(admin)).send({ tipo: 'otro', cantidad: -2 }).expect(400);
      expect(res.body.message).toBeTruthy();
      expect(res.body.errores).toHaveProperty('tipo');
      expect(res.body.errores).toHaveProperty('cantidad');
    });

    it('registra la exportacion en auditoria solo con tipo, cantidad y filtros saneados', async () => {
      const res = await request(app).post(url).set(h(admin)).send({
        tipo: 'productos_excel', cantidad: 31,
        filtros: { soloConStock: true, categoria: 'Laptops', password: 'x', extra: { a: 1 }, busqueda: 'a'.repeat(300) },
        productos: [{ nombre: 'no debe guardarse' }],
      }).expect(201);
      expect(res.body.filtros).toEqual({ soloConStock: true, categoria: 'Laptops', busqueda: 'a'.repeat(100) });
      await new Promise(r => setTimeout(r, 250));
      const log = await AuditLog.findOne({ where: { tabla: 'exportaciones', accion: 'exportar' }, order: [['id_log', 'DESC']] });
      expect(log).toBeTruthy();
      const datos = JSON.parse(log.datos_nuevos);
      expect(datos.tipo).toBe('productos_excel');
      expect(datos.cantidad).toBe(31);
      expect(datos).not.toHaveProperty('productos');
      expect(log.datos_nuevos).not.toContain('no debe guardarse');
      expect(log.usuario_id).toBe(admin.id_user);
    });
  });
});
