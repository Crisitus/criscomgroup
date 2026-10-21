const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { SignedXml } = require('xml-crypto');
const forge = require('node-forge');


// Modo SUNAT: solo el valor exacto 'production' habilita produccion. Cualquier otro
// (vacio, typo, mayusculas) cae de forma segura a pruebas/beta y se avisa una sola vez.
let modeWarned = false;
const sunatModeInfo = () => {
  const raw = process.env.SUNAT_MODE;
  const value = String(raw ?? '').trim();
  const valid = value === 'production' || value === 'sandbox';
  const mode = value === 'production' ? 'production' : 'sandbox';
  const warning = valid ? null : `SUNAT_MODE ${raw === undefined || value === '' ? 'no esta definido' : 'tiene un valor invalido'}: se usa modo pruebas (beta). Define SUNAT_MODE=sandbox o SUNAT_MODE=production.`;
  if (warning && !modeWarned) { modeWarned = true; console.warn(`[sunat] ${warning}`); }
  return { mode, valid, warning };
};
const sunatMode = () => sunatModeInfo().mode;
const BETA_URL = 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService';
const PRODUCTION_URL = 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService';

const escapeXml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const money = value => Number(value || 0).toFixed(2);
const round2 = value => Math.round(Number(value || 0) * 100) / 100;
const words = amount => `SON ${money(amount)} SOLES`;

const buildInvoiceXml = ({ company, sale, details }) => {
  const type = sale.tipo_documento === '1' ? '01' : '03';
  const id = `${sale.serie}-${String(sale.correlativo).padStart(8, '0')}`;
  const total = Number(sale.total_con_igv);
  const computedLines = details.map(detail => {
    const lineTotal = Number(detail.subtotal_con_igv);
    const lineTaxable = round2(lineTotal / 1.18);
    const lineIgv = round2(lineTotal - lineTaxable);
    return { detail, lineTaxable, lineIgv };
  });
  // El total del documento se deriva sumando los valores de línea ya redondeados
  // (no recalculando desde `total`), para que LineExtensionAmount del documento
  // coincida exactamente con la suma de las líneas y SUNAT no rechace por descuadre.
  const taxable = round2(computedLines.reduce((sum, l) => sum + l.lineTaxable, 0));
  const igv = round2(computedLines.reduce((sum, l) => sum + l.lineIgv, 0));
  const lines = computedLines.map(({ detail, lineTaxable, lineIgv }, index) => {
    const description = detail.descripcion || detail.producto?.nombre || `Producto ${detail.producto_id}`;
    const itemCode = detail.producto?.sku || detail.producto_id || 'SERVICIO';
    return `<cac:InvoiceLine><cbc:ID>${index + 1}</cbc:ID><cbc:InvoicedQuantity unitCode="NIU">${detail.cantidad}</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="PEN">${money(lineTaxable)}</cbc:LineExtensionAmount><cac:PricingReference><cac:AlternativeConditionPrice><cbc:PriceAmount currencyID="PEN">${money(detail.precio_unitario_con_igv)}</cbc:PriceAmount><cbc:PriceTypeCode>01</cbc:PriceTypeCode></cac:AlternativeConditionPrice></cac:PricingReference><cac:TaxTotal><cbc:TaxAmount currencyID="PEN">${money(lineIgv)}</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="PEN">${money(lineTaxable)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="PEN">${money(lineIgv)}</cbc:TaxAmount><cac:TaxCategory><cbc:Percent>18.00</cbc:Percent><cbc:TaxExemptionReasonCode>10</cbc:TaxExemptionReasonCode><cac:TaxScheme><cbc:ID>1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal><cac:Item><cbc:Description>${escapeXml(description)}</cbc:Description><cac:SellersItemIdentification><cbc:ID>${escapeXml(itemCode)}</cbc:ID></cac:SellersItemIdentification></cac:Item><cac:Price><cbc:PriceAmount currencyID="PEN">${money(Number(detail.precio_unitario_con_igv) / 1.18)}</cbc:PriceAmount></cac:Price></cac:InvoiceLine>`;
  }).join('');
  const date = new Date(sale.fecha).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  return `<?xml version="1.0" encoding="UTF-8"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"><ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent></ext:ExtensionContent></ext:UBLExtension></ext:UBLExtensions><cbc:UBLVersionID>2.1</cbc:UBLVersionID><cbc:CustomizationID>2.0</cbc:CustomizationID><cbc:ID>${id}</cbc:ID><cbc:IssueDate>${date}</cbc:IssueDate><cbc:InvoiceTypeCode listID="0101">${type}</cbc:InvoiceTypeCode><cbc:Note languageLocaleID="1000">${escapeXml(words(total))}</cbc:Note><cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode><cac:Signature><cbc:ID>${escapeXml(company.ruc)}</cbc:ID><cac:SignatoryParty><cac:PartyIdentification><cbc:ID>${escapeXml(company.ruc)}</cbc:ID></cac:PartyIdentification><cac:PartyName><cbc:Name>${escapeXml(company.razon_social)}</cbc:Name></cac:PartyName></cac:SignatoryParty><cac:DigitalSignatureAttachment><cac:ExternalReference><cbc:URI>#SignatureSP</cbc:URI></cac:ExternalReference></cac:DigitalSignatureAttachment></cac:Signature><cac:AccountingSupplierParty><cac:Party><cac:PartyIdentification><cbc:ID schemeID="6">${escapeXml(company.ruc)}</cbc:ID></cac:PartyIdentification><cac:PartyLegalEntity><cbc:RegistrationName>${escapeXml(company.razon_social)}</cbc:RegistrationName><cac:RegistrationAddress><cbc:AddressTypeCode>0000</cbc:AddressTypeCode><cac:AddressLine><cbc:Line>${escapeXml(company.direccion)}</cbc:Line></cac:AddressLine><cac:Country><cbc:IdentificationCode>PE</cbc:IdentificationCode></cac:Country></cac:RegistrationAddress></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty><cac:AccountingCustomerParty><cac:Party><cac:PartyIdentification><cbc:ID schemeID="${sale.cliente_tipo_documento || '1'}">${escapeXml(sale.cliente_numero_documento || '00000000')}</cbc:ID></cac:PartyIdentification><cac:PartyLegalEntity><cbc:RegistrationName>${escapeXml(sale.cliente_nombre || 'CLIENTE VARIOS')}</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty><cac:TaxTotal><cbc:TaxAmount currencyID="PEN">${money(igv)}</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="PEN">${money(taxable)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="PEN">${money(igv)}</cbc:TaxAmount><cac:TaxCategory><cac:TaxScheme><cbc:ID>1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal><cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="PEN">${money(taxable)}</cbc:LineExtensionAmount><cbc:TaxInclusiveAmount currencyID="PEN">${money(total)}</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="PEN">${money(total)}</cbc:PayableAmount></cac:LegalMonetaryTotal>${lines}</Invoice>`;
};

const configFor = company => {
  const key = String(company?.sunat_config_key || 'RUC10').replace(/[^A-Z0-9_]/gi, '').toUpperCase();
  const scoped = name => process.env[`SUNAT_${key}_${name}`] || process.env[`SUNAT_${name}`];
  return {
    ruc: String(company?.ruc || scoped('RUC') || ''),
    // Las variables del servidor tienen prioridad. En instalaciones administradas
    // desde el ERP se usan las credenciales cifradas/almacenadas del emisor.
    solUser: scoped('SOL_USER') || company?.sol_user || '',
    solPassword: scoped('SOL_PASSWORD') || company?.sol_pass || '',
    certificatePath: scoped('CERTIFICATE_PATH') || company?.cert_path || '',
    privateKeyPath: scoped('PRIVATE_KEY_PATH') || company?.cert_path || '',
    pfxPath: scoped('PFX_PATH'),
    pfxPassword: scoped('PFX_PASSWORD_B64')
      ? Buffer.from(scoped('PFX_PASSWORD_B64'), 'base64').toString('utf8')
      : scoped('PFX_PASSWORD'),
    billServiceUrl: scoped('BILL_SERVICE_URL'),
  };
};

const signingMaterial = config => {
  if (config.pfxPath) {
    if (!config.pfxPassword) throw new Error('Falta la contraseña del certificado PKCS#12');
    const binary = fs.readFileSync(config.pfxPath).toString('binary');
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(binary));
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, config.pfxPassword);
    const keyBags = [
      ...(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || []),
      ...(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] || []),
    ];
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
    if (!keyBags[0]?.key || !certBags[0]?.cert) throw new Error('El PKCS#12 no contiene certificado y clave privada utilizables');
    return {
      privateKey: forge.pki.privateKeyToPem(keyBags[0].key),
      certificate: forge.pki.certificateToPem(certBags[0].cert).replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g, ''),
    };
  }
  if (!config.privateKeyPath || !config.certificatePath) throw new Error('Faltan certificado y clave privada SUNAT');
  const keyPem = fs.readFileSync(config.privateKeyPath, 'utf8');
  const certPem = fs.readFileSync(config.certificatePath, 'utf8');
  const privateKey = keyPem.match(/-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA )?PRIVATE KEY-----/)?.[0];
  const certificateBlock = certPem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/)?.[0];
  if (!privateKey || !certificateBlock) throw new Error('El archivo SUNAT debe contener la clave privada y el certificado en formato PEM');
  return { privateKey, certificate: certificateBlock.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g, '') };
};

const signXml = (xml, company) => {
  const config = configFor(company);
  if (!config.pfxPath && (!config.privateKeyPath || !config.certificatePath)) {
    if (sunatMode() === 'sandbox') return xml;
    throw new Error('Faltan certificado y clave privada SUNAT');
  }
  const { privateKey, certificate } = signingMaterial(config);
  const signature = new SignedXml({ privateKey, getKeyInfoContent: () => `<ds:X509Data><ds:X509Certificate>${certificate}</ds:X509Certificate></ds:X509Data>` });
  const canonicalization = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315#WithComments';
  signature.canonicalizationAlgorithm = canonicalization;
  signature.addReference({
    xpath: "//*[local-name(.)='Invoice']",
    transforms: ['http://www.w3.org/2000/09/xmldsig#enveloped-signature', canonicalization],
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    isEmptyUri: true,
  });
  signature.signatureAlgorithm = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
  signature.computeSignature(xml, { location: { reference: "//*[local-name(.)='ExtensionContent']", action: 'append' }, attrs: { Id: 'SignatureSP' } });
  return signature.getSignedXml();
};

const sendBill = async ({ fileName, signedXml, company }) => {
  const zip = new AdmZip();
  zip.addFile(`${fileName}.xml`, Buffer.from(signedXml, 'utf8'));
  const content = zip.toBuffer().toString('base64');
  const config = configFor(company);
  if (sunatMode() === 'sandbox' && !config.solUser) return { sandbox: true, code: '0', description: 'XML generado en sandbox; no enviado a SUNAT', cdr: null };
  const username = `${config.ruc}${config.solUser}`;
  const password = config.solPassword;
  if (!username || !password) throw new Error('Credenciales SOL secundarias no configuradas');
  const soap = `<?xml version="1.0"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"><soapenv:Header><wsse:Security><wsse:UsernameToken><wsse:Username>${escapeXml(username)}</wsse:Username><wsse:Password>${escapeXml(password)}</wsse:Password></wsse:UsernameToken></wsse:Security></soapenv:Header><soapenv:Body><ser:sendBill><fileName>${fileName}.zip</fileName><contentFile>${content}</contentFile></ser:sendBill></soapenv:Body></soapenv:Envelope>`;
  let response;
  try {
    response = await axios.post(config.billServiceUrl || (sunatMode() === 'production' ? PRODUCTION_URL : BETA_URL), soap, { headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: 'sendBill' }, timeout: 30000 });
  } catch (error) {
    const body = String(error.response?.data || '');
    const faultCode = body.match(/<(?:\w+:)?faultcode[^>]*>([^<]+)</i)?.[1]?.trim();
    const faultMessage = body.match(/<(?:\w+:)?faultstring[^>]*>([^<]+)</i)?.[1]?.trim();
    if (faultCode || faultMessage) {
      throw new Error(`SUNAT rechazó el envío${faultCode ? ` (${faultCode})` : ''}: ${faultMessage || 'Error SOAP sin descripción'}`);
    }
    throw new Error(`No se pudo comunicar con SUNAT${error.response?.status ? ` (HTTP ${error.response.status})` : ''}`);
  }
  const cdrMatch = String(response.data).match(/<applicationResponse[^>]*>([^<]+)<\/applicationResponse>/);
  if (!cdrMatch) throw new Error('SUNAT no devolvió CDR');
  const cdrBuffer = Buffer.from(cdrMatch[1], 'base64');
  const cdrZip = new AdmZip(cdrBuffer);
  const cdrEntry = cdrZip.getEntries().find(entry => !entry.isDirectory && /\.xml$/i.test(entry.entryName))
    || cdrZip.getEntries().find(entry => !entry.isDirectory);
  const cdrXml = cdrEntry?.getData().toString('utf8') || '';
  const code = cdrXml.match(/<(?:\w+:)?ResponseCode[^>]*>([^<]+)</i)?.[1]?.trim() || '';
  const description = cdrXml.match(/<(?:\w+:)?Description[^>]*>([^<]+)</i)?.[1]?.trim() || '';
  if (!code) throw new Error('SUNAT devolvió un CDR sin código de respuesta reconocible');
  return { sandbox: false, code, description, cdr: cdrBuffer };
};

const saveArtifacts = ({ fileName, xml, cdr }) => {
  const dir = path.resolve(__dirname, '../uploads/private/comprobantes');
  fs.mkdirSync(dir, { recursive: true });
  const xmlPath = path.join(dir, `${fileName}.xml`);
  const xmlBuffer = Buffer.from(xml, 'utf8');
  if (fs.existsSync(xmlPath)) {
    const existing = fs.readFileSync(xmlPath);
    if (!crypto.timingSafeEqual(crypto.createHash('sha256').update(existing).digest(), crypto.createHash('sha256').update(xmlBuffer).digest())) {
      throw new Error('Ya existe un XML distinto con el mismo identificador');
    }
  } else {
    fs.writeFileSync(xmlPath, xmlBuffer, { flag: 'wx' });
  }
  let cdrPath = null;
  if (cdr) {
    cdrPath = path.join(dir, `R-${fileName}.zip`);
    if (!fs.existsSync(cdrPath)) fs.writeFileSync(cdrPath, cdr, { flag: 'wx' });
  }
  return { xmlPath, cdrPath, hash: crypto.createHash('sha256').update(xml).digest('hex') };
};

const fileExists = value => { try { return Boolean(value) && fs.existsSync(value); } catch { return false; } };
// Estado real del material de firma y de las credenciales SOL (sin exponer valores).
const readiness = company => {
  const config = configFor(company);
  const certificate = Boolean(
    (config.pfxPath && config.pfxPassword && fileExists(config.pfxPath))
    || (config.certificatePath && config.privateKeyPath && fileExists(config.certificatePath) && fileExists(config.privateKeyPath)),
  );
  const sol = Boolean(config.ruc && config.solUser && config.solPassword);
  const scopedKey = String(company?.sunat_config_key || 'RUC10').replace(/[^A-Z0-9_]/gi, '').toUpperCase();
  const fromEnv = name => Boolean(process.env[`SUNAT_${scopedKey}_${name}`] || process.env[`SUNAT_${name}`]);
  return {
    certificate,
    sol,
    complete: certificate && sol,
    sol_source: fromEnv('SOL_USER') ? 'servidor' : (company?.sol_user ? 'empresa' : 'ninguna'),
    certificate_source: (fromEnv('PFX_PATH') || fromEnv('CERTIFICATE_PATH')) ? 'servidor' : (company?.cert_path ? 'empresa' : 'ninguna'),
  };
};

module.exports = { buildInvoiceXml, signXml, sendBill, saveArtifacts, configFor, sunatMode, sunatModeInfo, readiness };
