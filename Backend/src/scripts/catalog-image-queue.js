const fs = require('fs')
const path = require('path')
const { Producto, ProductoImagen, ProductoProveedorAliado, Categoria } = require('../models')
const { publicAvailability } = require('../services/stock-availability.service')
const { sequelize } = require('../config/database')

;(async () => {
  await sequelize.authenticate()
  const uploadDir = path.join(__dirname, '..', 'uploads', 'productos')
  const products = await Producto.scope('allBusinesses').findAll({
    include: [
      { model: ProductoImagen, as: 'imagenes', required: false },
      { model: ProductoProveedorAliado, as: 'proveedores_aliados', required: false },
      { model: Categoria, as: 'categoria', required: false },
    ],
  })
  const queue = products.map(product => {
    const availability = publicAvailability(product)
    const primary = path.basename(String(product.imagen_url || ''))
    const primaryOk = primary && fs.existsSync(path.join(uploadDir, primary))
    const secondaryOk = (product.imagenes || []).filter(image => {
      const filename = path.basename(String(image.image_path || ''))
      return filename && fs.existsSync(path.join(uploadDir, filename))
    }).length
    const imageCount = Number(primaryOk) + secondaryOk
    const price = Number(product.precio_oferta_con_igv || product.precio_unitario_con_igv || 0)
    const availabilityRank = availability.stock > 0 ? 0 : availability.stock_otra_sede > 0 ? 1 : availability.compra_requiere_confirmacion ? 2 : 3
    return { id: product.id_producto, sku: product.sku, name: product.nombre, category: product.categoria?.nombre || 'Sin categoría', price, stock: availability.stock, imageCount, imagesNeeded: Math.max(0, 3 - imageCount), availabilityRank }
  }).filter(item => item.imagesNeeded > 0 && item.price > 0 && item.price < 50000)
    .sort((a, b) => a.availabilityRank - b.availabilityRank || b.stock - a.stock || b.price - a.price || a.name.localeCompare(b.name))
  const report = { generatedAt: new Date().toISOString(), totalProducts: products.length, pendingProducts: queue.length, missingImages: queue.reduce((sum, item) => sum + item.imagesNeeded, 0), queue }
  fs.writeFileSync(path.join(uploadDir, '.catalog-image-queue.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ ...report, queue: queue.slice(0, Number(process.env.QUEUE_LIMIT || 20)) }, null, 2))
  await sequelize.close()
})().catch(async error => { console.error(error); await sequelize.close().catch(() => {}); process.exit(1) })

