'use strict';

const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto } = require('../helpers/seed');
const { gerente } = require('../fixtures/users.fixture');
const { Pedido, DetalleVenta, Producto, Pago, MovimientoInventario } = require('../../src/models');
const culqi = require('../../src/services/culqi.service');
const shippingQuote = require('../../src/services/shipping-quote.service');

describe('Pedidos web y pagos Culqi', () => {
  let product;
  let order;
  let paymentToken;

  beforeAll(async () => {
    process.env.PAYMENTS_MODE = 'sandbox';
    await setupTestDb();
    const master = await createUser({ ...gerente, email: 'master-pedidos@test.local' });
    process.env.MASTER_ADMIN_EMAIL = master.email;
    product = await createProducto({ sku: 'WEB-PAY-001', nombre: 'Producto web', stock: 5, precio_unitario_con_igv: 118 });
  });

  it('crea un pedido con token de pago opaco y sin exponer su hash', async () => {
    jest.spyOn(shippingQuote, 'quote').mockResolvedValueOnce({ amount: 7, zone: 'arequipa_centro', distance_km: 4 });
    const response = await request(app).post('/api/pedidos').send({
      items: [{ productId: product.id_producto, quantity: 1 }],
      cliente_email: 'cliente@test.local',
      cliente_nombre: 'Cliente Prueba',
      cliente_telefono: '999999999',
      tipo_entrega: 'domicilio',
      direccion_envio: 'Dirección de prueba',
      direccion_departamento: 'Arequipa',
      direccion_provincia: 'Arequipa',
      direccion_distrito: 'Arequipa',
      metodo_pago: 'tarjeta',
      tipo_comprobante: 'boleta',
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.payment_token).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(response.body.pedido.payment_token_hash).toBeUndefined();
    expect(Number(response.body.pedido.costo_envio)).toBe(7);
    expect(Number(response.body.pedido.total_final)).toBe(125);
    order = response.body.pedido;
    paymentToken = response.body.payment_token;
  });

  it('calcula S/30 para delivery interprovincial', async () => {
    const response = await request(app).post('/api/pedidos').send({
      items: [{ productId: product.id_producto, quantity: 1 }],
      cliente_email: 'provincia@test.local',
      cliente_nombre: 'Cliente Provincia',
      cliente_telefono: '999999997',
      tipo_entrega: 'domicilio',
      direccion_envio: 'Jr. Principal 123',
      direccion_departamento: 'Puno',
      direccion_provincia: 'San Román',
      direccion_distrito: 'Juliaca',
      metodo_pago: 'contraentrega',
      tipo_comprobante: 'boleta',
    });
    expect(response.statusCode).toBe(201);
    expect(Number(response.body.pedido.costo_envio)).toBe(30);
  });

  it('rechaza el cobro si falta el token privado del pedido', async () => {
    const response = await request(app)
      .post(`/api/pedidos/${order.id_pedido}/pagar-culqi`)
      .send({ token: 'tkn_test' });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/autorización/i);
  });

  it('impide crear notas de venta desde el canal público', async () => {
    const response = await request(app).post('/api/pedidos').send({
      items: [{ productId: product.id_producto, quantity: 1 }],
      cliente_email: 'cliente@test.local',
      cliente_nombre: 'Cliente Prueba',
      cliente_telefono: '999999999',
      tipo_entrega: 'recojo_tienda',
      metodo_pago: 'transferencia',
      tipo_comprobante: 'nota_venta',
    });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/boleta o factura/i);
  });

  it('suma lineas duplicadas del mismo producto antes de validar el stock', async () => {
    const response = await request(app).post('/api/pedidos').send({
      items: [
        { productId: product.id_producto, quantity: 3 },
        { productId: product.id_producto, quantity: 3 },
      ],
      cliente_email: 'duplicado@test.local',
      cliente_nombre: 'Cliente Duplicado',
      cliente_telefono: '999999996',
      tipo_entrega: 'recojo_tienda',
      metodo_pago: 'transferencia',
      tipo_comprobante: 'boleta',
    });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/stock insuficiente/i);
  });

  it('procesa el cobro sandbox, descuenta stock e incluye el envío en la venta', async () => {
    const response = await request(app)
      .post(`/api/pedidos/${order.id_pedido}/pagar-culqi`)
      .set('X-Order-Payment-Token', paymentToken)
      .send({ token: 'tkn_test' });

    expect(response.statusCode).toBe(200);
    const storedOrder = await Pedido.findByPk(order.id_pedido);
    const storedProduct = await Producto.findByPk(product.id_producto);
    const lines = await DetalleVenta.findAll({ where: { venta_id: storedOrder.venta_id } });
    expect(storedOrder.estado_pago).toBe('pagado');
    expect(storedProduct.stock).toBe(4);
    expect(lines).toHaveLength(2);
    expect(lines.some(line => line.descripcion === 'Servicio de entrega a domicilio')).toBe(true);
    const movement = await MovimientoInventario.findOne({
      where: { referencia_tipo: 'venta', referencia_id: storedOrder.venta_id, producto_id: product.id_producto },
    });
    expect(movement).not.toBeNull();
    expect(movement.stock_anterior).toBe(5);
    expect(movement.stock_nuevo).toBe(4);
  });

  it('el seguimiento público no expone correo, teléfono ni documento', async () => {
    const response = await request(app).get(`/api/pedidos/seguimiento/${order.numero_pedido}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.pedido.cliente_email).toBeUndefined();
    expect(response.body.pedido.cliente_telefono).toBeUndefined();
    expect(response.body.pedido.cliente_documento_numero).toBeUndefined();
  });

  it('conserva un cargo aprobado si falla el registro local y lo reconcilia por webhook', async () => {
    const limitedProduct = await createProducto({ sku: 'WEB-REC-001', nombre: 'Producto reconciliación', stock: 1, precio_unitario_con_igv: 59 });
    const created = await request(app).post('/api/pedidos').send({
      items: [{ productId: limitedProduct.id_producto, quantity: 1 }],
      cliente_email: 'reconciliacion@test.local',
      cliente_nombre: 'Cliente Reconciliación',
      cliente_telefono: '999999998',
      tipo_entrega: 'recojo_tienda',
      metodo_pago: 'tarjeta',
      tipo_comprobante: 'boleta',
    });
    await limitedProduct.update({ stock: 0 });

    const charged = await request(app)
      .post(`/api/pedidos/${created.body.pedido.id_pedido}/pagar-culqi`)
      .set('X-Order-Payment-Token', created.body.payment_token)
      .send({ token: 'tkn_test_reconcile' });
    expect(charged.statusCode).toBe(202);
    expect(charged.body.pending_reconciliation).toBe(true);

    const payment = await Pago.findOne({ where: { id_pedido: created.body.pedido.id_pedido } });
    expect(payment.proveedor_id).toMatch(/^chr_test_/);
    expect(payment.estado).toBe('fallido');

    await limitedProduct.update({ stock: 1 });
    process.env.CULQI_PUBLIC_KEY = 'pk_test_reconcile';
    process.env.CULQI_SECRET_KEY = 'sk_test_reconcile';
    const retrieve = jest.spyOn(culqi, 'retrieveCharge').mockResolvedValue({
      id: payment.proveedor_id,
      amount: payment.monto_centimos,
      currency_code: 'PEN',
      outcome: { type: 'venta_exitosa' },
      metadata: { order_number: created.body.pedido.numero_pedido },
      source: { last_four: '4242' },
      test: true,
    });

    const webhook = await request(app).post('/api/pedidos/webhooks/culqi').send({ data: { object: { id: payment.proveedor_id } } });
    expect(webhook.statusCode).toBe(200);
    expect((await Pago.findByPk(payment.id_pago)).estado).toBe('pagado');
    expect((await Pedido.findByPk(created.body.pedido.id_pedido)).estado_pago).toBe('pagado');
    retrieve.mockRestore();
    delete process.env.CULQI_PUBLIC_KEY;
    delete process.env.CULQI_SECRET_KEY;
  });
});
