'use strict';
/**
 * B1 / T1.1 — Fail-fast de boot en producción
 * Strict TDD: archivo creado ANTES de implementar validateEnv.js.
 * Estado inicial esperado: ROJO (Cannot find module '../../src/config/validateEnv').
 */
const { validateEnv } = require('../../src/config/validateEnv');

describe('validateEnv — fail-fast en producción', () => {
  let exitSpy;
  let consoleSpy;

  beforeEach(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('llama process.exit(1) en producción sin FRONTEND_ORIGIN', () => {
    const saved = guardarEnv(['NODE_ENV', 'FRONTEND_ORIGIN', 'JWT_SECRET']);
    process.env.NODE_ENV = 'production';
    delete process.env.FRONTEND_ORIGIN;
    process.env.JWT_SECRET = 'secreto-valido-para-test';

    try {
      validateEnv();
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/FATAL/));
    } finally {
      restaurarEnv(saved);
    }
  });

  it('llama process.exit(1) en producción sin JWT_SECRET', () => {
    const saved = guardarEnv(['NODE_ENV', 'FRONTEND_ORIGIN', 'JWT_SECRET']);
    process.env.NODE_ENV = 'production';
    process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
    delete process.env.JWT_SECRET;

    try {
      validateEnv();
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      restaurarEnv(saved);
    }
  });

  it('NO llama process.exit en entorno de test o development', () => {
    // NODE_ENV=test es inyectado por setup.env.js — validación se omite
    validateEnv();
    expect(exitSpy).not.toHaveBeenCalled();
  });
});

// --- Helpers de aislamiento de env ---

function guardarEnv(keys) {
  return keys.reduce((acc, k) => ({ ...acc, [k]: process.env[k] }), {});
}

function restaurarEnv(saved) {
  Object.entries(saved).forEach(([k, v]) => {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  });
}
