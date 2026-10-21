const { Oferta, Producto } = require('../models');
const { aplicarOfertas, quitarOferta, esOfertaVigente } = require('../services/ofertas.service');

const MAX_LOTE = 500;
const fallo = (res, error) => {
  console.error('ofertas-del-dia:', error);
  return res.status(500).json({ success: false, message: 'Error interno al gestionar ofertas' });
};

// GET /api/ofertas-del-dia
// Curaduría admin sobre la tabla ofertas (única fuente de verdad): incluye la
// vigencia y un flag `vigente` calculado; no duplica precio de oferta.
exports.getOfertasDelDia = async (req, res) => {
  try {
    const ofertas = await Oferta.findAll({
      include: [{ model: Producto, as: 'producto', attributes: ['nombre', 'precio_unitario'] }]
    });
    res.json(ofertas.map((o) => ({ ...o.toJSON(), vigente: esOfertaVigente(o) })));
  } catch (error) {
    fallo(res, error);
  }
};

// PUT /api/ofertas-del-dia
// Body: item o [item]; item = { id_producto, precio_fijo } | { id_producto, descuento }
// mas vigencia opcional { vigente_desde?, vigente_hasta? } (ISO 8601; null = sin límite).
// Atomico: si un item falla no se aplica ninguno. 200 todo ok; 422 con `errores` si alguno falla.
exports.putOfertasDelDia = async (req, res) => {
  try {
    const body = req.body;
    if (body === null || body === undefined || typeof body !== 'object') {
      return res.status(400).json({ success: false, message: 'El cuerpo debe ser un item o una lista de items' });
    }
    const items = Array.isArray(body) ? body : [body];
    if (items.length === 0) return res.status(400).json({ success: false, message: 'La lista de ofertas esta vacia' });
    if (items.length > MAX_LOTE) return res.status(400).json({ success: false, message: `Maximo ${MAX_LOTE} productos por lote` });

    const { ok, resultados } = await aplicarOfertas(items);
    const procesadas = resultados.filter((r) => r.estado === 'aplicada').map((r) => r.id_producto);
    const errores = resultados.filter((r) => r.estado === 'error');
    if (!ok) {
      return res.status(422).json({ success: false, message: 'No se aplico ninguna oferta: hay items con error', resultados, procesadas, errores });
    }
    res.json({ success: true, resultados, procesadas, errores: [] });
  } catch (error) {
    fallo(res, error);
  }
};

const statusDe = (resultados) => {
  const ok = resultados.filter((r) => r.estado === 'aplicada').length;
  if (ok === resultados.length) return 200;
  return ok === 0 ? 404 : 207;
};

// DELETE /api/ofertas-del-dia/:productoId  (limpia el producto aunque no exista fila en ofertas)
exports.deleteOfertaDelDia = async (req, res) => {
  try {
    const r = await quitarOferta(req.params.productoId);
    if (r.estado === 'aplicada') return res.json({ success: true, resultados: [r] });
    const status = r.estado === 'omitida' || /no encontrado/i.test(r.motivo || '') ? 404 : 400;
    res.status(status).json({ success: false, message: r.motivo, resultados: [r] });
  } catch (error) {
    fallo(res, error);
  }
};

// POST /api/ofertas-del-dia/eliminar-lote  Body: { ids: [1,2,3] }
exports.deleteOfertasLote = async (req, res) => {
  try {
    const ids = req.body && req.body.ids;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, message: "Debe enviar 'ids' (lista no vacia)" });
    if (ids.length > MAX_LOTE) return res.status(400).json({ success: false, message: `Maximo ${MAX_LOTE} productos por lote` });
    const unicos = [...new Set(ids.map(String))];
    const resultados = [];
    for (const id of unicos) resultados.push(await quitarOferta(id));
    const errores = resultados.filter((r) => r.estado !== 'aplicada');
    res.status(statusDe(resultados)).json({
      success: errores.length === 0,
      resultados,
      procesadas: resultados.filter((r) => r.estado === 'aplicada').map((r) => r.id_producto),
      errores
    });
  } catch (error) {
    fallo(res, error);
  }
};
