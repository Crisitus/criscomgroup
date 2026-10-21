'use strict';
const path = require('path');
const fs = require('fs');
// Carga .env.test antes de que cualquier módulo llame a dotenv.config()
// override: true fuerza sobreescribir las vars inyectadas por docker-compose env_file
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test'), override: true });

// Permite ejecutar la suite directamente en Windows contra la base portátil
// local, sin alterar la configuración usada por Docker/CI.
if (process.env.LOCAL_TEST_DB === 'true') {
  process.env.DB_HOST = '127.0.0.1';
  process.env.DB_PORT = process.env.LOCAL_TEST_DB_PORT || '3307';
}

// `db-test` solo existe en la red interna de Docker. Al ejecutar `npm test`
// directamente en Windows/Linux host, usamos SQLite en memoria: mantiene la
// base completamente aislada, evita depender de Docker Desktop y conserva el
// safety check de DB_NAME. Docker y CI siguen probando contra MySQL.
const runningInDocker = fs.existsSync('/.dockerenv');
const runningInCi = process.env.CI === 'true';
const forceMysql = process.env.TEST_DB_DIALECT === 'mysql';
if (!runningInDocker && !runningInCi && !forceMysql && process.env.LOCAL_TEST_DB !== 'true') {
  process.env.DB_DIALECT = 'sqlite';
  process.env.DB_STORAGE = ':memory:';
}

// ecommerce-integration hot-patch: activar feature flag FEATURE_ECOMMERCE en
// tests por default para que las rutas /api/ecommerce/* estén montadas.
// Se setea con OR para permitir override explícito si un test lo necesita.
process.env.FEATURE_ECOMMERCE = 'true';
process.env.FEATURE_MARKETING = 'true';
