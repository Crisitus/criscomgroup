const { analyzeDiagnostic } = require('../../src/services/diagnostic-assistant.service');

describe('asistente de diagnóstico técnico', () => {
  test('prioriza almacenamiento y respaldo con SMART degradado', () => {
    const result = analyzeDiagnostic({ sintomas: 'La laptop está lenta y se congela', pruebas: { smart_salud: 55 } });
    expect(result.hypotheses[0].cause).toContain('almacenamiento degradada');
    expect(result.hypotheses[0].confidence).toBe(92);
    expect(result.red_flags.join(' ')).toContain('respaldo');
  });

  test('usa evidencia de memoria para una hipótesis fuerte', () => {
    const result = analyzeDiagnostic({ sintomas: 'Pantalla azul y se cuelga', pruebas: { memoria: 'fallo' } });
    expect(result.hypotheses[0].cause).toContain('Memoria RAM');
    expect(result.hypotheses[0].confidence).toBe(94);
  });

  test('no inventa una causa cuando faltan datos', () => {
    const result = analyzeDiagnostic({ sintomas: 'Comportamiento extraño', pruebas: {} });
    expect(result.hypotheses[0].confidence).toBe(20);
    expect(result.disclaimer).toContain('provisional');
  });

  test('un video externo positivo orienta a panel o flex', () => {
    const result = analyzeDiagnostic({ sintomas: 'No da imagen en su pantalla', pruebas: { video_externo: true } });
    expect(result.hypotheses[0].confidence).toBe(82);
    expect(result.hypotheses[0].actions.join(' ')).toContain('panel');
  });
});
