jest.mock('sequelize', () => ({ Sequelize: jest.fn(), DataTypes: {} }));

const { shouldSyncSchema } = require('../../src/config/database');

describe('política de sincronización de base de datos', () => {
  test('auto sincroniza una base vacía o incompleta', () => {
    expect(shouldSyncSchema('auto', [])).toBe(true);
    expect(shouldSyncSchema('auto', ['users'])).toBe(true);
  });

  test('auto omite sync global cuando existen tablas base', () => {
    expect(shouldSyncSchema('auto', ['Users', 'roles', 'productos'])).toBe(false);
  });

  test('always y never permiten control operativo explícito', () => {
    expect(shouldSyncSchema('always', ['users', 'roles'])).toBe(true);
    expect(shouldSyncSchema('never', [])).toBe(false);
  });

  test('rechaza una política desconocida', () => {
    expect(() => shouldSyncSchema('sometimes', [])).toThrow('auto, always o never');
  });
});
