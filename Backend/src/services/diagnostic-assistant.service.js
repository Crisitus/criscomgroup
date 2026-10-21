const normalize = value => String(value || '').trim().toLowerCase();
const finite = value => value === '' || value === null || value === undefined ? null : Number(value);

const analyzeDiagnostic = input => {
  const symptoms = normalize(input.sintomas);
  const tests = input.pruebas && typeof input.pruebas === 'object' ? input.pruebas : {};
  const hypotheses = [];
  const nextTests = new Set();
  const redFlags = [];
  const add = (cause, confidence, evidence, actions) => hypotheses.push({ cause, confidence, evidence, actions });
  const has = (...terms) => terms.some(term => symptoms.includes(term));

  if (has('no enciende', 'no prende', 'sin energía', 'sin energia')) {
    if (tests.led_carga === false) add('Entrada de energía, cargador o circuito de carga', 78, ['No hay LED de carga'], ['Medir voltaje del cargador', 'Probar cargador conocido', 'Medir líneas primarias y buscar corto']);
    else add('Secuencia de encendido o placa madre', 58, ['Síntoma de ausencia de encendido'], ['Descarga eléctrica', 'Arranque mínimo', 'Medir líneas always-on']);
    nextTests.add('Verificar consumo con fuente regulable y límite de corriente');
  }
  if (has('se apaga', 'reinicia', 'calienta', 'temperatura')) {
    const temp = finite(tests.temperatura_cpu);
    const confidence = Number.isFinite(temp) && temp >= 90 ? 88 : 62;
    add('Sistema térmico degradado o protección por temperatura', confidence, temp === null ? ['Apagado/calor reportado'] : [`CPU registrada a ${temp} °C`], ['Inspeccionar ventilador y disipador', 'Renovar interfaz térmica si corresponde', 'Prueba de carga controlada']);
    nextTests.add('Registrar temperaturas y frecuencia durante carga');
  }
  if (has('lento', 'congela', 'disco', 'windows demora')) {
    const health = finite(tests.smart_salud);
    if (Number.isFinite(health) && health < 80) {
      add('Unidad de almacenamiento degradada', 92, [`SMART ${health}%`], ['Respaldar datos antes de pruebas destructivas', 'Revisar atributos SMART críticos', 'Evaluar reemplazo']);
      redFlags.push('Priorizar respaldo: posible pérdida de datos');
    } else add('Almacenamiento, memoria o software requieren aislamiento', 55, ['Lentitud/congelamiento reportado'], ['SMART completo', 'Prueba de memoria', 'Revisar carga de inicio y eventos del sistema']);
  }
  if (has('pantalla azul', 'bsod', 'error de memoria', 'se cuelga')) {
    if (tests.memoria === 'fallo') add('Memoria RAM o controlador de memoria inestable', 94, ['Prueba de memoria reportó fallo'], ['Probar módulos individualmente', 'Limpiar/revisar slots', 'Validar frecuencias JEDEC']);
    else add('RAM, controlador, driver o almacenamiento', 60, ['Inestabilidad/BSOD reportado'], ['MemTest prolongado', 'Analizar minidumps', 'SMART y prueba de almacenamiento']);
  }
  if (has('no da imagen', 'pantalla negra', 'sin video')) {
    add('Ruta de video, memoria, firmware o panel', tests.video_externo === true ? 82 : 57, [tests.video_externo === true ? 'Existe video externo' : 'Sin video reportado'], tests.video_externo === true ? ['Revisar panel, flex y alimentación de pantalla'] : ['Probar salida externa', 'POST mínimo', 'Reasentar RAM y limpiar CMOS']);
  }
  if (has('batería', 'bateria', 'no carga', 'dura poco')) {
    const battery = finite(tests.salud_bateria);
    if (Number.isFinite(battery) && battery < 70) add('Batería degradada', 90, [`Capacidad estimada ${battery}%`], ['Verificar ciclos y capacidad real', 'Cotizar reemplazo compatible']);
    else add('Batería, cargador o circuito de carga', 56, ['Problema de autonomía/carga reportado'], ['Generar battery report', 'Probar cargador', 'Medir entrada y carga']);
  }
  if (!hypotheses.length) {
    add('Información insuficiente para una hipótesis responsable', 20, ['No coincide con reglas verificables'], ['Describir cuándo ocurre, frecuencia y mensajes exactos', 'Ejecutar inspección visual y pruebas base']);
  }
  hypotheses.sort((a, b) => b.confidence - a.confidence);
  hypotheses.slice(0, 3).forEach(item => item.actions.forEach(action => nextTests.add(action)));
  return {
    hypotheses: hypotheses.slice(0, 3),
    next_tests: [...nextTests],
    red_flags: redFlags,
    disclaimer: 'Resultado asistido y provisional. Un técnico debe validar cada hipótesis con mediciones antes de cotizar o intervenir.',
    engine: 'criscom-rules-pc-v1',
  };
};

module.exports = { analyzeDiagnostic, finite };
