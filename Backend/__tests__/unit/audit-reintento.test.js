'use strict';
jest.mock('../../src/models', () => ({
  AuditLog: { create: jest.fn() },
  User: { findByPk: jest.fn().mockResolvedValue(null) },
}));

const { AuditLog } = require('../../src/models');
const { registrarEventoConReintento } = require('../../src/middlewares/audit.middleware');

describe('M9: auditoria con reintento garantizado', () => {
  beforeEach(() => jest.clearAllMocks());

  const payload = {
    req: { user: { id: 1 }, ip: '127.0.0.1', headers: {} },
    accion: 'crear',
    tabla: 'ventas',
    registro_id: 1,
    despues: { ok: true },
    estado_http: 201,
  };

  it('escribe a la primera cuando no hay fallo', async () => {
    AuditLog.create.mockResolvedValue({ id: 1 });
    const res = await registrarEventoConReintento(payload);
    expect(res).toEqual({ id: 1 });
    expect(AuditLog.create).toHaveBeenCalledTimes(1);
  });

  it('reintenta tras fallos transitorios y termina escribiendo', async () => {
    AuditLog.create
      .mockRejectedValueOnce(new Error('deadlock'))
      .mockRejectedValueOnce(new Error('lock timeout'))
      .mockResolvedValue({ id: 2 });
    const res = await registrarEventoConReintento(payload);
    expect(res).toEqual({ id: 2 });
    expect(AuditLog.create).toHaveBeenCalledTimes(3);
  });

  it('agota los intentos, registra el error y NO lanza excepcion', async () => {
    AuditLog.create.mockRejectedValue(new Error('db caida'));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await registrarEventoConReintento(payload);
    expect(res).toBeNull();
    expect(AuditLog.create).toHaveBeenCalledTimes(3);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
