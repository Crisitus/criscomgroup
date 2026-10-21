const { normalizeWhatsappPhone, renderWhatsapp } = require('../../src/services/whatsapp-template.service');

const order = { cliente: 'Ana', equipo: 'Laptop Lenovo', codigo: 'ST-100', estado: 'listo', telefono: '987 654 321', token_seguimiento: 'abc123', numero_serie: 'SECRET-SERIAL', diagnostico_configuracion: 'dato privado', costo_mano_obra: 500 };

describe('plantillas WhatsApp de servicio', () => {
  test.each([['987654321','51987654321'],['+51 987-654-321','51987654321'],['1 202 555 0198','12025550198']])('normaliza %s', (input, expected) => expect(normalizeWhatsappPhone(input)).toBe(expected));
  test.each(['12345678','abc','1234567890123456'])('rechaza teléfono inválido %s', input => expect(() => normalizeWhatsappPhone(input)).toThrow('inválido'));
  test('genera wa.me con dominio público configurado', () => {
    const result = renderWhatsapp({ order, template: 'listo', publicBaseUrl: 'https://criscomgroup.com.pe/' });
    expect(result.url).toContain('https://wa.me/51987654321');
    expect(result.message).toContain('https://criscomgroup.com.pe/servicio-tecnico/seguimiento');
  });
  test('no filtra serie, diagnóstico ni montos', () => {
    const message = renderWhatsapp({ order, template: 'estado', publicBaseUrl: '' }).message;
    expect(message).not.toContain('SECRET-SERIAL');
    expect(message).not.toContain('dato privado');
    expect(message).not.toContain('500');
  });
  test('rechaza plantillas libres o desconocidas', () => expect(() => renderWhatsapp({ order, template: 'custom', publicBaseUrl: '' })).toThrow('Plantilla'));
});
