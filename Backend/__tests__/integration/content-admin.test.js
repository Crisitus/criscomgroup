'use strict';
const request = require('supertest');
const { app } = require('../../src/app');
const { setupTestDb } = require('../helpers/db');
const { createUser, createEmpresa } = require('../helpers/seed');
const { getAuthToken } = require('../helpers/auth');
const { gerente } = require('../fixtures/users.fixture');

describe('Contenido web administrativo', () => {
  let token;

  beforeAll(async () => {
    await setupTestDb();
    const user = await createUser(gerente);
    await createEmpresa(user.id_user);
    token = getAuthToken(user);
  });

  it('permite editar y guardar redes en la base aislada', async () => {
    const res = await request(app)
      .patch('/api/social-links/admin')
      .set('Authorization', `Bearer ${token}`)
      .send({ instagram_url: 'https://www.instagram.com/criscom_test/', whatsapp_number: '51904589554' });
    expect(res.statusCode).toBe(200);
    expect(res.body.instagram_url).toBe('https://www.instagram.com/criscom_test/');
  });

  it('permite subir un banner de imagen con el rol autorizado', async () => {
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415408d763f8cfc0f01f00050001ff89993d1d0000000049454e44ae426082', 'hex');
    const res = await request(app)
      .post('/api/marketing/banners')
      .set('Authorization', `Bearer ${token}`)
      .attach('imagen_banner', png, { filename: 'banner-test.png', contentType: 'image/png' });
    expect(res.statusCode).toBe(201);
    expect(res.body.banner.media_type).toBe('image');
  });
});
