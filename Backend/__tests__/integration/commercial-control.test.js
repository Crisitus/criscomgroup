'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createProducto } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { MovimientoInventario } = require('../../src/models');

describe('Control comercial unificado', () => {
  let user, token, product;
  beforeAll(async () => { await setupTestDb(); user = await createUser({ name:'Administrador', email:'commercial@test.local', password:'Clave123!', id_role:2 }); token=getAuthToken(user); product=await createProducto({ sku:'COST-1', nombre:'SSD de costo', stock:10, precio_unitario_con_igv:100 }); await product.update({ costo_promedio:40, ultimo_costo:40, stock_minimo:5 }); });
  it('recibe una compra, distribuye costos y recalcula stock y costo promedio', async () => {
    const supplier=await request(app).post('/api/commercial/suppliers').set('Authorization',`Bearer ${token}`).send({razon_social:'Proveedor Lima',ruc_documento:'20123456789'}).expect(201);
    await request(app).post('/api/commercial/purchases').set('Authorization',`Bearer ${token}`).send({proveedor_id:supplier.body.id_proveedor,documento:'F001-1',costos_adicionales:20,items:[{producto_id:product.id_producto,cantidad:2,costo_unitario:50}]}).expect(201);
    await product.reload(); expect(Number(product.stock)).toBe(12); expect(Number(product.ultimo_costo)).toBe(60); expect(Number(product.costo_promedio)).toBeCloseTo(43.3333,2);
    const movement=await MovimientoInventario.findOne({where:{producto_id:product.id_producto,tipo:'compra'}}); expect(movement.stock_anterior).toBe(10); expect(movement.stock_nuevo).toBe(12);
  });
  it('calcula margen visible y crea cotización con costo real', async () => {
    const dashboard=await request(app).get('/api/commercial/inventory/dashboard').set('Authorization',`Bearer ${token}`).expect(200); expect(dashboard.body.products[0].margen_unitario).toBeCloseTo(41.42,1);
    const quote=await request(app).post('/api/commercial/quotes').set('Authorization',`Bearer ${token}`).send({cliente_nombre:'Cliente',escenario:'recomendada',items:[{producto_id:product.id_producto,cantidad:1,precio_unitario:100}]}).expect(201); expect(Number(quote.body.margen)).toBeCloseTo(41.42,1);
    await request(app).patch(`/api/commercial/quotes/${quote.body.id_cotizacion}/status`).set('Authorization',`Bearer ${token}`).send({estado:'aprobada'}).expect(409);
    await request(app).patch(`/api/commercial/quotes/${quote.body.id_cotizacion}/status`).set('Authorization',`Bearer ${token}`).send({estado:'enviada'}).expect(200);
    await request(app).patch(`/api/commercial/quotes/${quote.body.id_cotizacion}/status`).set('Authorization',`Bearer ${token}`).send({estado:'aprobada'}).expect(200);
    const converted=await request(app).post(`/api/commercial/quotes/${quote.body.id_cotizacion}/convert`).set('Authorization',`Bearer ${token}`).send({metodo_pago:'efectivo'}).expect(200); expect(converted.body.venta_id).toBeTruthy(); await product.reload(); expect(product.stock).toBe(11);
  });
  it('una cotización convertida no se reabre ni se convierte dos veces', async () => {
    const auth={Authorization:`Bearer ${token}`};
    const quote=await request(app).post('/api/commercial/quotes').set(auth).send({cliente_nombre:'Doble',estado:'enviada',items:[{producto_id:product.id_producto,cantidad:1,precio_unitario:100}]}).expect(201);
    await request(app).post(`/api/commercial/quotes/${quote.body.id_cotizacion}/convert`).set(auth).send({}).expect(200);
    await request(app).patch(`/api/commercial/quotes/${quote.body.id_cotizacion}/status`).set(auth).send({estado:'enviada'}).expect(409);
    await request(app).post(`/api/commercial/quotes/${quote.body.id_cotizacion}/convert`).set(auth).send({}).expect(409);
    await request(app).post('/api/commercial/quotes').set(auth).send({cliente_nombre:'Atajo',estado:'convertida',items:[{producto_id:product.id_producto,cantidad:1}]}).expect(400);
  });
  it('reparte el descuento para que el detalle de la venta cuadre con el total', async () => {
    const { Venta, DetalleVenta } = require('../../src/models');
    const auth={Authorization:`Bearer ${token}`};
    const quote=await request(app).post('/api/commercial/quotes').set(auth).send({cliente_nombre:'Descuento',estado:'enviada',descuento:10,items:[{producto_id:product.id_producto,cantidad:3,precio_unitario:33.33}]}).expect(201);
    expect(Number(quote.body.total)).toBeCloseTo(89.99,2);
    const conv=await request(app).post(`/api/commercial/quotes/${quote.body.id_cotizacion}/convert`).set(auth).send({}).expect(200);
    const sale=await Venta.scope('allBusinesses').findByPk(conv.body.venta_id); const lines=await DetalleVenta.findAll({where:{venta_id:conv.body.venta_id}});
    expect(Number(sale.total_con_igv)).toBeCloseTo(89.99,2); expect(lines.reduce((s,l)=>s+Number(l.subtotal_con_igv),0)).toBeCloseTo(89.99,2); expect(sale.es_descuento).toBeTruthy();
  });
  it('rechaza cantidades decimales y descuentos mayores al subtotal', async () => {
    const auth={Authorization:`Bearer ${token}`};
    await request(app).post('/api/commercial/quotes').set(auth).send({cliente_nombre:'X',items:[{producto_id:product.id_producto,cantidad:1.5,precio_unitario:100}]}).expect(400);
    await request(app).post('/api/commercial/quotes').set(auth).send({cliente_nombre:'X',descuento:150,items:[{producto_id:product.id_producto,cantidad:1,precio_unitario:100}]}).expect(400);
  });
  it('una cotización vencida no se convierte y se marca vencida al listar', async () => {
    const { Cotizacion } = require('../../src/models');
    const auth={Authorization:`Bearer ${token}`};
    const quote=await request(app).post('/api/commercial/quotes').set(auth).send({cliente_nombre:'Vieja',estado:'enviada',vigencia_dias:2,items:[{producto_id:product.id_producto,cantidad:1,precio_unitario:100}]}).expect(201);
    await Cotizacion.update({creado_en:new Date(Date.now()-5*86400000)},{where:{id_cotizacion:quote.body.id_cotizacion},silent:true});
    await request(app).post(`/api/commercial/quotes/${quote.body.id_cotizacion}/convert`).set(auth).send({}).expect(409);
    const list=await request(app).get('/api/commercial/quotes').set(auth).expect(200);
    expect(list.body.find(q=>q.id_cotizacion===quote.body.id_cotizacion).estado).toBe('vencida');
  });
  it('convierte compras en USD a soles y permite anular revirtiendo stock', async () => {
    const auth={Authorization:`Bearer ${token}`};
    const p=await createProducto({ sku:'USD-1', nombre:'GPU USD', stock:0, precio_unitario_con_igv:500 });
    const sup=await request(app).post('/api/commercial/suppliers').set(auth).send({razon_social:'Proveedor USD',affiliate_business_id:999}).expect(201);
    expect(sup.body.affiliate_business_id).toBeNull();
    await request(app).post('/api/commercial/purchases').set(auth).send({proveedor_id:sup.body.id_proveedor,moneda:'USD',items:[{producto_id:p.id_producto,cantidad:2,costo_unitario:100}]}).expect(400);
    const buy=await request(app).post('/api/commercial/purchases').set(auth).send({proveedor_id:sup.body.id_proveedor,moneda:'USD',tipo_cambio:3.75,items:[{producto_id:p.id_producto,cantidad:2,costo_unitario:100}]}).expect(201);
    await p.reload(); expect(p.stock).toBe(2); expect(Number(p.costo_promedio)).toBeCloseTo(375,2);
    await request(app).post(`/api/commercial/purchases/${buy.body.id_compra}/void`).set(auth).send({}).expect(400);
    const voided=await request(app).post(`/api/commercial/purchases/${buy.body.id_compra}/void`).set(auth).send({motivo:'Factura errada'}).expect(200);
    expect(voided.body.estado).toBe('anulada'); await p.reload(); expect(p.stock).toBe(0);
    await request(app).post(`/api/commercial/purchases/${buy.body.id_compra}/void`).set(auth).send({motivo:'otra vez'}).expect(409);
  });
});
