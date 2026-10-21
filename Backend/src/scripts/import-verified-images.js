const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { Producto, ProductoImagen } = require('../models')
const { sequelize } = require('../config/database')
const manifest = require('./verified-image-manifest.json')

;(async () => {
  await sequelize.authenticate()
  const uploadDir = path.join(__dirname, '..', 'uploads', 'productos')
  fs.mkdirSync(uploadDir, { recursive: true })
  const report = []
  for (const entry of manifest) {
    const product = await Producto.scope('allBusinesses').findByPk(entry.id, { include: [{ model: ProductoImagen, as: 'imagenes', required: false }] })
    if (!product) { report.push({ id: entry.id, status: 'producto_no_encontrado' }); continue }
    // El manifiesto es la fuente verificada completa para estos productos.
    // Sustituir la galería evita conservar imágenes anteriores equivocadas o duplicadas.
    await ProductoImagen.destroy({ where: { id_producto: product.id_producto } })
    const saved = []
    for (let index = 0; index < entry.images.length; index++) {
      const response = await fetch(entry.images[index], { headers: { 'user-agent': 'Mozilla/5.0 CriscomCatalog/1.0', referer: entry.source } })
      const type = response.headers.get('content-type') || ''
      const bytes = Buffer.from(await response.arrayBuffer())
      if (!response.ok || !/^image\//.test(type) || bytes.length < 5000) throw new Error(`Imagen inválida para ${entry.id}: ${response.status} ${type} ${bytes.length}`)
      const hash = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12)
      const ext = type.includes('webp') ? 'webp' : type.includes('png') ? 'png' : 'jpg'
      const filename = `verified-${entry.id}-${index + 1}-${hash}.${ext}`
      fs.writeFileSync(path.join(uploadDir, filename), bytes)
      const imagePath = `/uploads/productos/${filename}`
      if (index === 0) await product.update({ imagen_url: imagePath })
      else {
        await ProductoImagen.create({ id_producto: product.id_producto, image_path: imagePath, orden: index })
      }
      saved.push({ filename, bytes: bytes.length })
    }
    report.push({ id: entry.id, name: product.nombre, model: entry.model, source: entry.source, saved })
  }
  console.log(JSON.stringify(report, null, 2))
  await sequelize.close()
})().catch(async error => { console.error(error); await sequelize.close().catch(() => {}); process.exit(1) })

