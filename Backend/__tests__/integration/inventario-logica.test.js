'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto, createCategoria, createCodigoBarras } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { MovimientoInventario } = require('../../src/models');

describe('Inventario y compras: reglas de negocio corregidas', () => {
  let auth;
  const used = { tipo_operacion: 'compra', transferente_tipo_documento: 'DNI', transferente_numero_documento: '87654321', transferente_nombre: 'Vendedor', monto_adquisicion: 300, tipo_componente: 'equipo_completo', estado_recepcion: 'Operativa', procedencia_declarada: 'Propio', declaracion_propiedad: true, prueba_funcional: 'aprobado' };
  beforeAll(async () => {
    await setupTestDb();
    const master = await createUser({ name: 'Maestro', email: 'master-logica@test.local', password: 'Clave123!', id_role: 1 });
    process.env.MASTER_ADMIN_EMAIL = master.email;
    auth = { Authorization: `Bearer ${getAuthToken(master)}` };
  });

  it('no borra una categoría con productos y rechaza nombres duplicados', async () => {
    const cat = await createCategoria({ nombre: 'Monitores test' });
    await createProducto({ sku: 'CAT-1', nombre: 'Monitor', id_categoria: cat.id_categoria });
    const res = await request(app).delete(`/api/categorias/${cat.id_categoria}`).set(auth).expect(409);
    expect(res.body.message).toMatch(/1 producto/);
    await request(app).post('/api/categorias').set(auth).send({ nombre: '  monitores TEST ' }).expect(409);
    const list = await request(app).get('/api/categorias').set(auth).expect(200);
    expect(list.body.find(c => c.id_categoria === cat.id_categoria).total_productos).toBe(1);
  });

  it('abre una categoría sin productos y lista adquisiciones sin producto', async () => {
    const empty = await createCategoria({ nombre: 'Vacía test' });
    await request(app).get(`/api/categorias/${empty.id_categoria}`).set(auth).expect(200);
    await request(app).post('/api/adquisiciones-usados').set(auth).send({ ...used, numero_serie: 'SN-NOPROD', registrar_inventario: false }).expect(201);
    const list = await request(app).get('/api/adquisiciones-usados').set(auth).expect(200);
    expect(list.body.some(a => a.numero_serie === 'SN-NOPROD')).toBe(true);
  });

  it('no borra un producto con historial y acepta borrar uno limpio', async () => {
    const withHistory = await createProducto({ sku: 'HIST-1', nombre: 'Con historial', stock: 3 });
    await MovimientoInventario.create({ producto_id: withHistory.id_producto, tipo: 'ajuste_entrada', cantidad: 3, stock_anterior: 0, stock_nuevo: 3, usuario_id: 1 });
    await request(app).delete(`/api/productos/${withHistory.id_producto}`).set(auth).expect(409);
    const clean = await createProducto({ sku: 'CLEAN-1', nombre: 'Limpio', stock: 0 });
    await request(app).delete(`/api/productos/${clean.id_producto}`).set(auth).expect(200);
  });

  it('edita el stock mínimo desde la ficha y rechaza compras a proveedores inactivos', async () => {
    const p = await createProducto({ sku: 'MIN-1', nombre: 'Minimo', stock: 2 });
    await request(app).put(`/api/productos/${p.id_producto}`).set(auth).send({ stock_minimo: 5 }).expect(200);
    await p.reload(); expect(p.stock_minimo).toBe(5); expect(p.stock).toBe(2);
    await request(app).put(`/api/productos/${p.id_producto}`).set(auth).send({ stock_minimo: -1 }).expect(400);
    const sup = await request(app).post('/api/commercial/suppliers').set(auth).send({ razon_social: 'Inactivo SAC', activo: false }).expect(201);
    await request(app).post('/api/commercial/purchases').set(auth).send({ proveedor_id: sup.body.id_proveedor, items: [{ producto_id: p.id_producto, cantidad: 1, costo_unitario: 10 }] }).expect(400);
  });

  it('mantiene el descuento de la oferta al cambiar el precio', async () => {
    const p = await createProducto({ sku: 'OFE-1', nombre: 'Oferta', precio_unitario: 84.75, precio_unitario_con_igv: 100 });
    await p.update({ es_oferta: true, precio_oferta_con_igv: 80, precio_oferta: 67.8 });
    await request(app).put(`/api/productos/${p.id_producto}`).set(auth).send({ precio_unitario_con_igv: 200, precio_unitario: 169.49 }).expect(200);
    await p.reload(); expect(Number(p.precio_oferta_con_igv)).toBeCloseTo(160, 2);
  });

  it('un código de barras no se puede asignar a dos productos', async () => {
    const a = await createProducto({ sku: 'BC-A', nombre: 'A' });
    const b = await createProducto({ sku: 'BC-B', nombre: 'B' });
    await createCodigoBarras(a.id_producto, '7750000099991', 2);
    await request(app).post(`/api/codigos-barras/producto/${b.id_producto}`).set(auth).send({ codigos_barras: [{ codigo: '7750000099991', cantidad: 1 }] }).expect(409);
    await request(app).put('/api/codigos-barras/7750000099991/cantidad').set(auth).send({ cantidad: 0 }).expect(400);
  });

  it('una importación recibida no cambia costos ni se cancela', async () => {
    const product = await createProducto({ sku: 'IMP-L', nombre: 'Importado', stock: 0 });
    const payload = { producto_id: product.id_producto, cantidad: 2, tipo_cambio: 3.75, referencia: 'IMP-LOCK', proveedor: 'Ext', pais_origen: 'China', descripcion: 'Lote', moneda: 'USD', costo_mercancia: 200, flete: 0, seguro: 0, tributos: 0, otros_costos: 0, estado: 'recibida' };
    const created = await request(app).post('/api/importaciones').set(auth).send(payload).expect(201);
    await request(app).put(`/api/importaciones/${created.body.id_importacion}`).set(auth).send({ ...payload, flete: 50 }).expect(400);
    await request(app).put(`/api/importaciones/${created.body.id_importacion}`).set(auth).send({ ...payload, estado: 'cancelada' }).expect(400);
    await request(app).put(`/api/importaciones/${created.body.id_importacion}`).set(auth).send({ ...payload, tracking: 'TRK-1' }).expect(200);
    const planned = { ...payload, producto_id: '', referencia: 'IMP-PLAN', estado: 'planificada' };
    await request(app).post('/api/importaciones').set(auth).send(planned).expect(201);
  });

  it('una adquisición no mezcla un equipo usado con stock nuevo y puede ingresar después', async () => {
    const nuevo = await createProducto({ sku: 'NEW-STK', nombre: 'Laptop nueva', stock: 4 });
    await request(app).post('/api/adquisiciones-usados').set(auth).send({ ...used, producto_id: nuevo.id_producto, numero_serie: 'SN-MIX', registrar_inventario: true }).expect(400);
    await nuevo.reload(); expect(nuevo.condicion).toBe('nuevo');
    const usado = await createProducto({ sku: 'USED-L', nombre: 'Laptop usada', stock: 0 });
    const created = await request(app).post('/api/adquisiciones-usados').set(auth).send({ ...used, producto_id: '', numero_serie: 'SN-LATER', registrar_inventario: false }).expect(201);
    await request(app).put(`/api/adquisiciones-usados/${created.body.adquisicion.id_adquisicion}`).set(auth).send({ producto_id: usado.id_producto, registrar_inventario: true }).expect(200);
    await usado.reload(); expect(usado.stock).toBe(1); expect(usado.condicion).toBe('segunda_mano');
    await request(app).post('/api/adquisiciones-usados').set(auth).send({ ...used, numero_serie: 'SN-LATER', registrar_inventario: false }).expect(400);
  });
});
