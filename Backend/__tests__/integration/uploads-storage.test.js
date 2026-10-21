'use strict';
/**
 * fix-wave-1.1 / HC8 hot-patch — Self-healing de dirs en upload middleware.
 *
 * Bug original (escapado al verify Round 2 de fix-wave-1):
 *   - B4 / D1=A introdujo `uploads/public` y `uploads/private` pero NO actualizó
 *     `upload.middleware.js`, que sigue escribiendo en 6 dirs legacy
 *     (`logos, certs, productos, categorias, banner, tarjetas`).
 *   - El named volume `erpcomp_backend_uploads` puede estar vacío tras
 *     `docker compose down -v` o un build sin seed inicial.
 *   - Resultado: PUT/POST con imagen → 500 ENOENT en producción.
 *
 * Este test simula el escenario "volume vacío" borrando el dir antes del POST.
 * Sin el fix self-healing en multer, el endpoint responde 500.
 * Con el fix, multer crea el dir bajo demanda y responde 201.
 *
 * NO cubre el refactor estructural del middleware a `uploads/public/<tipo>`
 * o `uploads/private/<tipo>` — eso queda como HC8 pleno para fix-wave-2.
 */
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createCategoria } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { gerente } = require('../fixtures/users.fixture');

// PNG válido de 1x1 píxel transparente (mínimo necesario para multer + sharp si lo hubiera).
const PNG_1PX = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63fcffff3f0005fe02fea33581840000000049454e44ae426082',
  'hex'
);

describe('Uploads storage — multer self-healing dirs (HC8 hot-patch)', () => {
  let adminToken;
  let categoria;
  const productosDir = path.join(__dirname, '../../src/uploads/productos');

  beforeAll(async () => {
    await setupTestDb();
    const gerenteUser = await createUser(gerente);
    adminToken = getAuthToken(gerenteUser);
    categoria = await createCategoria({ nombre: 'Storage Test' });
  });

  beforeEach(() => {
    // Simular escenario "named volume vacío": borrar el dir destino antes de cada test.
    // Sin el fix, multer fallará con ENOENT al intentar escribir.
    if (fs.existsSync(productosDir)) {
      fs.rmSync(productosDir, { recursive: true, force: true });
    }
  });

  it('POST /api/productos con imagen escribe en disco aunque el dir no exista (auto-mkdir)', async () => {
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('sku', 'SKU-UPLOAD-TEST-001')
      .field('nombre', 'Producto Upload Test')
      .field('id_categoria', String(categoria.id_categoria))
      .field('precio_unitario', '10')
      .field('precio_unitario_con_igv', '11.80')
      .field('stock', '5')
      .attach('imagen', PNG_1PX, 'test.png');

    expect(res.statusCode).toBe(201);
    expect(res.body.producto.imagen_url).toMatch(/imagen-\d+-\d+\.png$/);
    expect(fs.existsSync(productosDir)).toBe(true);
    expect(fs.readdirSync(productosDir).length).toBeGreaterThan(0);
  });
});
