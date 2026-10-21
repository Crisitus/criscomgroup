'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { gerente } = require('../fixtures/users.fixture');
const { Pedido } = require('../../src/models');
const { cleanupExpiredOrders } = require('../../src/services/order-expiration.service');

describe('Vencimiento de pedidos impagos', () => {
  let token;
  let product;
  beforeAll(async () => {
    await setupTestDb();
    const manager = await createUser({ ...gerente, email: 'expiration@test.local' });
    token = getAuthToken(manager);
    product = await createProducto({ sku: 'EXP-ORDER-1', stock: 5 });
  });
  const create = () => request(app).post('/api/pedidos').send({
    items: [{ productId: product.id_producto, quantity: 1 }],
    cliente_email: 'pending@test.local', cliente_nombre: 'Pendiente', cliente_telefono: '999999999',
    tipo_entrega: 'recojo_tienda', metodo_pago: 'contraentrega', tipo_comprobante: 'boleta',
  });

  it('elimina automáticamente pedidos sin pago después de 24 horas', async () => {
    const created = await create().expect(201);
    await Pedido.update({ fecha_creacion: new Date(Date.now() - 25 * 3600000) }, { where: { id_pedido: created.body.pedido.id_pedido }, silent: true });
    expect(await cleanupExpiredOrders()).toBe(1);
    expect(await Pedido.findByPk(created.body.pedido.id_pedido)).toBeNull();
  });

  it('al cancelar un pedido impago lo elimina inmediatamente', async () => {
    const created = await create().expect(201);
    const response = await request(app).patch(`/api/pedidos/admin/${created.body.pedido.id_pedido}/estado`)
      .set('Authorization', `Bearer ${token}`).send({ estado: 'cancelado' }).expect(200);
    expect(response.body.deleted).toBe(true);
    expect(await Pedido.findByPk(created.body.pedido.id_pedido)).toBeNull();
  });
});
