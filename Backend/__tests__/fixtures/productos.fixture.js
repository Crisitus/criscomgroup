'use strict';

// Fixtures planos (sin persistir). Usar con createProducto() del helper seed.
const productoConStock = {
  sku: 'SKU-CON-STOCK-001',
  nombre: 'Producto Con Stock',
  precio_unitario: 10.00,
  precio_unitario_con_igv: 11.80,
  stock: 5,
  es_oferta: false,
};

const productoSinStock = {
  sku: 'SKU-SIN-STOCK-001',
  nombre: 'Producto Sin Stock',
  precio_unitario: 10.00,
  precio_unitario_con_igv: 11.80,
  stock: 0,
  es_oferta: false,
};

module.exports = { productoConStock, productoSinStock };
