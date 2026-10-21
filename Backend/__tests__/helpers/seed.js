'use strict';
const bcrypt = require('bcryptjs');
const { User, Producto, Categoria, CodigoBarras, Company } = require('../../src/models');

/**
 * Crea un usuario en la DB de test con password hasheado.
 */
const createUser = async ({ name, email, password, id_role = 3 }) => {
  const hash = await bcrypt.hash(password, 10);
  return User.create({ name, email, password: hash, id_role });
};

/**
 * Crea una categoría de test.
 */
const createCategoria = async (data = {}) => {
  return Categoria.create({
    nombre: data.nombre || 'Categoria Test',
    descripcion: data.descripcion || null,
  });
};

/**
 * Crea un producto de test.
 * Si no se provee id_categoria, crea una categoría automáticamente.
 */
const createProducto = async (data = {}) => {
  const categoria = data.id_categoria
    ? { id_categoria: data.id_categoria }
    : await createCategoria();

  return Producto.create({
    sku: data.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    nombre: data.nombre || 'Producto Test',
    precio_unitario: data.precio_unitario !== undefined ? data.precio_unitario : 10.00,
    precio_unitario_con_igv: data.precio_unitario_con_igv !== undefined ? data.precio_unitario_con_igv : 11.80,
    stock: data.stock !== undefined ? data.stock : 10,
    id_categoria: data.id_categoria || categoria.id_categoria,
    es_oferta: data.es_oferta || false,
  });
};

/**
 * Crea un código de barras asociado a un producto.
 */
const createCodigoBarras = async (id_producto, codigo, cantidad = 10) => {
  return CodigoBarras.create({
    codigo_barras: codigo || `CB-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    id_producto,
    cantidad,
  });
};

/**
 * Crea una empresa (Company) de test asociada a un usuario.
 */
const createEmpresa = async (id_user) => {
  return Company.create({
    razon_social: 'Empresa Test S.A.C.',
    ruc: '20000000001',
    direccion: 'Av. Test 123, Lima',
    sol_user: 'TESTUSR',
    sol_pass: 'TESTPASS',
    cert_path: '/test/cert.pfx',
    id_user,
  });
};

module.exports = { createUser, createProducto, createCategoria, createCodigoBarras, createEmpresa };
