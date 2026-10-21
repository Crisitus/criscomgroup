const stateLabels = { recibido: 'recibido', diagnostico: 'en diagnóstico', cotizado: 'cotizado', aprobado: 'aprobado', en_proceso: 'en reparación', pruebas: 'en pruebas', listo: 'listo para entrega', entregado: 'entregado', cancelado: 'cancelado' };
const templates = {
  estado: order => `Hola ${order.cliente}, tu ${order.equipo} (${order.codigo}) está ${stateLabels[order.estado] || order.estado}.`,
  recibido: order => `Hola ${order.cliente}, recibimos tu ${order.equipo} con la orden ${order.codigo}. Iniciaremos la evaluación técnica y te avisaremos antes de realizar trabajos no autorizados.`,
  cotizacion: order => `Hola ${order.cliente}, la cotización de tu orden ${order.codigo} está lista. Revísala con CRISCOM antes de autorizar cualquier trabajo.`,
  listo: order => `Hola ${order.cliente}, tu ${order.equipo} de la orden ${order.codigo} está listo para coordinar la entrega.`,
  entregado: order => `Hola ${order.cliente}, registramos la entrega de tu ${order.equipo} (${order.codigo}). Conserva tu constancia y condiciones de garantía.`,
};

const normalizeWhatsappPhone = value => {
  let phone = String(value || '').replace(/\D/g, '');
  if (phone.length === 9) phone = `51${phone}`;
  if (!/^\d{10,15}$/.test(phone)) throw new Error('Número de WhatsApp inválido; usa código de país');
  return phone;
};

const renderWhatsapp = ({ order, template, publicBaseUrl }) => {
  if (!templates[template]) throw new Error('Plantilla de WhatsApp inválida');
  const phone = normalizeWhatsappPhone(order.telefono);
  const tracking = order.token_seguimiento && publicBaseUrl ? `\nSeguimiento: ${String(publicBaseUrl).replace(/\/$/, '')}/servicio-tecnico/seguimiento?codigo=${encodeURIComponent(order.token_seguimiento)}` : '';
  const message = `${templates[template](order)}${tracking}\nCRISCOM`;
  return { phone, message, url: `https://wa.me/${phone}?text=${encodeURIComponent(message)}` };
};

module.exports = { templates, normalizeWhatsappPhone, renderWhatsapp };
