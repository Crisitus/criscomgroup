'use strict';

const sunat = require('../../src/services/sunat.service');

describe('Servicio SUNAT en sandbox', () => {
  const originalMode = process.env.SUNAT_MODE;
  const originalUser = process.env.SUNAT_RUC10_SOL_USER;

  beforeAll(() => {
    process.env.SUNAT_MODE = 'sandbox';
    delete process.env.SUNAT_RUC10_SOL_USER;
  });

  afterAll(() => {
    if (originalMode === undefined) delete process.env.SUNAT_MODE; else process.env.SUNAT_MODE = originalMode;
    if (originalUser === undefined) delete process.env.SUNAT_RUC10_SOL_USER; else process.env.SUNAT_RUC10_SOL_USER = originalUser;
  });

  it('genera UBL 2.1 escapado y no envía una operación real sin credenciales sandbox', async () => {
    const company = { ruc: '10123456789', razon_social: 'Criscom & Prueba', direccion: 'Lima < Arequipa', sunat_config_key: 'RUC10' };
    const sale = { tipo_documento: '3', serie: 'B001', correlativo: 1, total_con_igv: 118, fecha: new Date('2026-08-03T12:00:00-05:00'), cliente_tipo_documento: '1', cliente_numero_documento: '12345678', cliente_nombre: 'Cliente Prueba' };
    const details = [{ producto_id: 1, descripcion: 'Equipo & accesorio', cantidad: 1, subtotal_con_igv: 118, precio_unitario_con_igv: 118 }];
    const xml = sunat.buildInvoiceXml({ company, sale, details });
    expect(xml).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>');
    expect(xml).toContain('<cbc:InvoiceTypeCode listID="0101">03</cbc:InvoiceTypeCode>');
    expect(xml).toContain('Criscom &amp; Prueba');
    expect(xml).toContain('Equipo &amp; accesorio');
    expect(xml).not.toContain('Criscom & Prueba');

    const signed = sunat.signXml(xml, company);
    expect(signed).toBe(xml);
    const result = await sunat.sendBill({ fileName: '10123456789-03-B001-00000001', signedXml: signed, company });
    expect(result).toMatchObject({ sandbox: true, code: '0' });
  });
});
