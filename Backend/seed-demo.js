// Seed de DEMO local — NO usar en producción.
// Crea una empresa emisora RUC 10 de prueba, categorías y productos de muestra
// para que la tienda y el ERP tengan catálogo navegable en desarrollo.
require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { Categoria, Producto, Company, User } = require('./src/models');

const IGV = 1.18;
const conIgv = (n) => Number((n * IGV).toFixed(2));

async function seed() {
  await sequelize.authenticate();

  // Cuenta maestra (creador de la empresa)
  const master = await User.findOne({ where: { id_role: 1 }, order: [['id_user', 'ASC']] });
  if (!master) throw new Error('No existe cuenta maestra (rol Gerente). Arranca el backend primero.');

  // --- Empresa emisora RUC 10 (datos de prueba, sandbox) ---
  const [company] = await Company.findOrCreate({
    where: { ruc: '10456789012' },
    defaults: {
      id_user: master.id_user,
      razon_social: 'CRISCOM GROUP DEMO E.I.R.L.',
      ruc: '10456789012',
      direccion: 'Av. Demo 123, Arequipa, Perú',
      sol_user: 'DEMOUSER',        // placeholder dev (sin SUNAT real)
      sol_pass: 'demo-sol-pass',    // placeholder dev
      cert_path: 'sandbox/no-cert', // placeholder dev
      production: false,
      tipo_ruc: '10',
      facturacion_habilitada: true,
      emisor_predeterminado: true,
      serie_factura: 'F001',
      serie_boleta: 'B001',
      sunat_config_key: 'RUC10',
      whatsapp_number: '51904589554',
    },
  });

  // --- Categorías ---
  const categoriasBase = [
    { nombre: 'Laptops', descripcion: 'Portátiles nuevos y reacondicionados' },
    { nombre: 'Componentes', descripcion: 'Partes y piezas de PC' },
    { nombre: 'Accesorios', descripcion: 'Periféricos y accesorios' },
  ];
  const categorias = {};
  for (const c of categoriasBase) {
    const [cat] = await Categoria.findOrCreate({ where: { nombre: c.nombre }, defaults: c });
    categorias[c.nombre] = cat.id_categoria;
  }

  // --- Productos ---
  const productos = [
    {
      sku: 'LAP-HP-14', nombre: 'Laptop HP 14 Ryzen 5', descripcion: '8GB RAM, 512GB SSD, Windows 11',
      precio_unitario: 1499.00, stock: 12, condicion: 'nuevo', garantia_meses: 12,
      id_categoria: categorias['Laptops'], es_oferta: false,
      imagen_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800',
    },
    {
      sku: 'LAP-LEN-15', nombre: 'Laptop Lenovo IdeaPad 15', descripcion: 'Intel i5, 16GB RAM, 512GB SSD',
      precio_unitario: 1899.00, stock: 7, condicion: 'nuevo', garantia_meses: 12,
      id_categoria: categorias['Laptops'], es_oferta: true, precio_oferta: 1699.00,
      imagen_url: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800',
    },
    {
      sku: 'LAP-DEL-13U', nombre: 'Laptop Dell XPS 13 (segunda mano)', descripcion: 'Reacondicionada, excelente estado',
      precio_unitario: 2199.00, stock: 3, condicion: 'segunda_mano', garantia_meses: 3,
      estado_observaciones: 'Ligeras marcas de uso en la tapa. Batería 90% de salud.',
      id_categoria: categorias['Laptops'], es_oferta: false,
      imagen_url: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=800',
    },
    {
      sku: 'CMP-SSD-1TB', nombre: 'SSD NVMe 1TB', descripcion: 'Lectura 3500MB/s',
      precio_unitario: 289.00, stock: 40, condicion: 'nuevo', garantia_meses: 24,
      id_categoria: categorias['Componentes'], es_oferta: false,
      imagen_url: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800',
    },
    {
      sku: 'ACC-MOU-LOG', nombre: 'Mouse inalámbrico Logitech', descripcion: 'Silencioso, USB-C recargable',
      precio_unitario: 79.00, stock: 60, condicion: 'nuevo', garantia_meses: 12,
      id_categoria: categorias['Accesorios'], es_oferta: true, precio_oferta: 59.00,
      imagen_url: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=800',
    },
  ];

  let creados = 0;
  for (const p of productos) {
    const payload = {
      ...p,
      precio_unitario_con_igv: conIgv(p.precio_unitario),
      precio_oferta_con_igv: p.es_oferta && p.precio_oferta ? conIgv(p.precio_oferta) : null,
    };
    const [, created] = await Producto.findOrCreate({ where: { sku: p.sku }, defaults: payload });
    if (created) creados++;
  }

  const totalProd = await Producto.count();
  const totalCat = await Categoria.count();
  console.log(`Empresa emisora: ${company.razon_social} (RUC ${company.ruc}, predeterminado=${company.emisor_predeterminado})`);
  console.log(`Categorías: ${totalCat} | Productos: ${totalProd} (nuevos creados en esta corrida: ${creados})`);
  await sequelize.close();
}

seed().catch(async (e) => {
  console.error('Error en seed-demo:', e.message);
  try { await sequelize.close(); } catch {}
  process.exit(1);
});
