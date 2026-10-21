'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { MovimientoInventario } = require('../../src/models');

describe('Fuentes unificadas del inventario', () => {
  let token;
  beforeAll(async () => {
    await setupTestDb();
    const master = await createUser({ name: 'Crisitus', email: 'master-inventory@test.local', password: 'Clave123!', id_role: 1 });
    process.env.MASTER_ADMIN_EMAIL = master.email;
    token = getAuthToken(master);
  });

  it('ingresa una adquisición aprobada al mismo producto y lo marca segunda mano', async () => {
    const product = await createProducto({ sku: 'USED-1', nombre: 'Laptop evaluada', stock: 0 });
    await request(app).post('/api/adquisiciones-usados').set('Authorization', `Bearer ${token}`).send({
      producto_id: product.id_producto,
      registrar_inventario: true,
      tipo_operacion: 'compra',
      transferente_tipo_documento: 'DNI',
      transferente_numero_documento: '12345678',
      transferente_nombre: 'Transferente Test',
      monto_adquisicion: 500,
      numero_serie: 'SERIE-USED-001',
      tipo_componente: 'equipo_completo',
      estado_recepcion: 'Operativa',
      procedencia_declarada: 'Equipo propio',
      declaracion_propiedad: true,
      prueba_funcional: 'aprobado',
    }).expect(201);
    await product.reload();
    expect(product.stock).toBe(1);
    expect(product.condicion).toBe('segunda_mano');
    expect(Number(product.costo_promedio)).toBe(500);
    expect(await MovimientoInventario.count({ where: { producto_id: product.id_producto, referencia_tipo: 'adquisicion_usado' } })).toBe(1);
  });

  it('registra una importación recibida una sola vez y marca el origen importado', async () => {
    const product = await createProducto({ sku: 'IMP-1', nombre: 'SSD importado', stock: 2 });
    const payload = { producto_id: product.id_producto, cantidad: 3, tipo_cambio: 3.8, referencia: 'IMP-TEST-1', proveedor: 'Proveedor exterior', pais_origen: 'China', descripcion: 'Lote SSD', moneda: 'USD', costo_mercancia: 300, flete: 30, seguro: 0, tributos: 0, otros_costos: 0, estado: 'planificada' };
    const created = await request(app).post('/api/importaciones').set('Authorization', `Bearer ${token}`).send(payload).expect(201);
    await product.reload(); expect(product.stock).toBe(2);
    await request(app).put(`/api/importaciones/${created.body.id_importacion}`).set('Authorization', `Bearer ${token}`).send({ ...payload, estado: 'recibida' }).expect(200);
    await product.reload(); expect(product.stock).toBe(5); expect(product.origen).toBe('importado');
    await request(app).put(`/api/importaciones/${created.body.id_importacion}`).set('Authorization', `Bearer ${token}`).send({ ...payload, estado: 'recibida' }).expect(200);
    await product.reload(); expect(product.stock).toBe(5);
    expect(await MovimientoInventario.count({ where: { producto_id: product.id_producto, referencia_tipo: 'importacion' } })).toBe(1);
  });
});
