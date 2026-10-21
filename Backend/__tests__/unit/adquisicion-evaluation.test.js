jest.mock('../../src/models', () => ({ AdquisicionUsado: {}, Producto: {} }));

const controller = require('../../src/controllers/adquisicion.controller');

const preview = async body => {
  const response = { statusCode: 200, payload: null };
  const res = {
    status(code) { response.statusCode = code; return this; },
    json(payload) { response.payload = payload; return this; },
  };
  await controller.evaluate({ body }, res);
  return response;
};

describe('evaluación de componentes usados', () => {
  test('clasifica SSD saludable y aprobado como grado A', async () => {
    const result = await preview({ tipo_componente: 'ssd', smart_salud_porcentaje: 98, tbw_escrito: 20, tbw_nominal: 600, prueba_funcional: 'aprobado' });
    expect(result.statusCode).toBe(200);
    expect(result.payload.evaluacion.grade).toBe('A');
    expect(result.payload.evaluacion.score).toBeGreaterThanOrEqual(90);
  });

  test('limita una evaluación pendiente y la marca como provisional', async () => {
    const result = await preview({ tipo_componente: 'ram', prueba_funcional: 'pendiente' });
    expect(result.payload.evaluacion.score).toBe(69);
    expect(result.payload.evaluacion.grade).toBe('C');
    expect(result.payload.evaluacion.alerts).toContain('Evaluación provisional: falta prueba funcional');
  });

  test('una prueba rechazada siempre produce defectuoso', async () => {
    const result = await preview({ tipo_componente: 'gpu', smart_salud_porcentaje: 100, prueba_funcional: 'rechazado' });
    expect(result.payload.evaluacion.grade).toBe('defectuoso');
    expect(result.payload.evaluacion.score).toBeLessThanOrEqual(25);
  });

  test.each([
    [{ tipo_componente: 'ssd', smart_salud_porcentaje: 101, prueba_funcional: 'aprobado' }, 'salud SMART'],
    [{ tipo_componente: 'ssd', smart_salud_porcentaje: 'abc', prueba_funcional: 'aprobado' }, 'salud SMART'],
    [{ tipo_componente: 'ssd', tbw_nominal: 0, prueba_funcional: 'aprobado' }, 'TBW nominal'],
    [{ tipo_componente: 'desconocido', prueba_funcional: 'aprobado' }, 'Tipo de componente'],
    [{ tipo_componente: 'ssd', ciclos_encendido: 1.5, prueba_funcional: 'aprobado' }, 'número entero'],
  ])('rechaza métricas inválidas', async (body, message) => {
    const result = await preview(body);
    expect(result.statusCode).toBe(400);
    expect(result.payload.message).toContain(message);
  });
});
