'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { gerente } = require('../fixtures/users.fixture');
const { AffiliateBusiness, PedidoVenta, Venta } = require('../../src/models');

const orderBody = items => ({
  items,
  cliente_email: 'marketplace@test.local',
  cliente_nombre: 'Cliente Marketplace',
  cliente_telefono: '999999999',
  tipo_entrega: 'recojo_tienda',
  metodo_pago: 'yape',
  tipo_comprobante: 'boleta',
});

describe('Marketplace multinstancia y validación de pagos', () => {
  let manager;
  let affiliate;
  let auditor;
  let business;
  let affiliateProduct;
  let criscomProduct;

  beforeAll(async () => {
    await setupTestDb();
    manager = await createUser({ ...gerente, email: 'manager-market@test.local' });
    process.env.MASTER_ADMIN_EMAIL = manager.email;
    affiliate = await createUser({ name: 'Afiliado', email: 'seller-market@test.local', password: 'Clave123!', id_role: 3 });
    business = await AffiliateBusiness.create({ owner_user_id: affiliate.id_user, nombre_comercial: 'Punto afiliado', logo_url: '/uploads/affiliate-logos/test.png', identidad_configurada: true, comision_porcentaje: 8 });
    await business.update({ prueba_finaliza_en: new Date(Date.now() - 86400000) });
    await affiliate.update({ tipo_vendedor: 'afiliado', affiliate_business_id: business.id_affiliate_business });
    auditor = await createUser({ name: 'Auditor', email: 'audit-market@test.local', password: 'Clave123!', id_role: 5 });
    await auditor.update({ acceso_expira_en: new Date(Date.now() + 3600000), acceso_otorgado_por: manager.id_user });
    affiliateProduct = await createProducto({ sku: 'AFF-MARKET-1', nombre: 'Producto afiliado', stock: 10, precio_unitario_con_igv: 100 });
    await affiliateProduct.update({ propietario_id: affiliate.id_user, affiliate_business_id: business.id_affiliate_business });
    criscomProduct = await createProducto({ sku: 'CRI-MARKET-1', nombre: 'Producto CRISCOM', stock: 10, precio_unitario_con_igv: 50 });
  });

  it('permite al afiliado validar solamente un pedido totalmente propio', async () => {
    const created = await request(app).post('/api/pedidos').send(orderBody([
      { productId: affiliateProduct.id_producto, quantity: 1 },
    ])).expect(201);
    await request(app).post(`/api/pedidos/${created.body.pedido.id_pedido}/confirmar-pago-manual`)
      .set('Authorization', `Bearer ${getAuthToken(await affiliate.reload())}`)
      .send({ referencia: 'QR-AFILIADO-1' })
      .expect(200);
    const links = await PedidoVenta.findAll({ where: { id_pedido: created.body.pedido.id_pedido } });
    expect(links).toHaveLength(1);
    const sale = await Venta.unscoped().findByPk(links[0].venta_id);
    expect(sale.affiliate_business_id).toBe(business.id_affiliate_business);
    expect(Number(sale.comision_servicio)).toBeCloseTo(8, 2);
  });

  it('agrega 5% únicamente al subtotal afiliado cuando la web cobra con tarjeta', async () => {
    const body = orderBody([
      { productId: affiliateProduct.id_producto, quantity: 1 },
      { productId: criscomProduct.id_producto, quantity: 1 },
    ]);
    body.metodo_pago = 'tarjeta';
    const created = await request(app).post('/api/pedidos').send(body).expect(201);
    expect(Number(created.body.pedido.subtotal)).toBe(150);
    expect(Number(created.body.pedido.recargo_tarjeta)).toBe(5);
    expect(Number(created.body.pedido.total_final)).toBe(155);
  });

  it('bloquea al afiliado en pedidos ajenos o mixtos y permite al auditor vigente', async () => {
    const created = await request(app).post('/api/pedidos').send(orderBody([
      { productId: affiliateProduct.id_producto, quantity: 1 },
      { productId: criscomProduct.id_producto, quantity: 1 },
    ])).expect(201);
    await request(app).post(`/api/pedidos/${created.body.pedido.id_pedido}/confirmar-pago-manual`)
      .set('Authorization', `Bearer ${getAuthToken(await affiliate.reload())}`)
      .send({ referencia: 'QR-MIXTO-1' })
      .expect(403);
    await request(app).post(`/api/pedidos/${created.body.pedido.id_pedido}/confirmar-pago-manual`)
      .set('Authorization', `Bearer ${getAuthToken(await auditor.reload())}`)
      .send({ referencia: 'QR-AUDITOR-1' })
      .expect(200);
    const links = await PedidoVenta.findAll({ where: { id_pedido: created.body.pedido.id_pedido } });
    expect(links).toHaveLength(2);
    expect(links.map(link => link.affiliate_business_id).sort()).toEqual([null, business.id_affiliate_business].sort());
  });
});
