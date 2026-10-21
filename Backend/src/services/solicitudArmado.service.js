const { Producto } = require("../models");
const S = require("./solicitud.service");

const MAX_LINEAS = 30;
const MAX_CANTIDAD = 50;

// Precio con IGV que ve el cliente en la tienda: oferta vigente o precio normal.
const precioVigente = (p) => {
  const oferta = Number(p.precio_oferta_con_igv);
  if (p.es_oferta && oferta > 0) return S.round2(oferta);
  return S.round2(p.precio_unitario_con_igv);
};

/**
 * Recalcula en servidor las líneas del modo marketplace contra el catálogo real.
 * Ignora nombre y precio enviados por el navegador; conserva el precio declarado
 * solo si difiere, para que el admin lo vea. Devuelve { lineas } o { error }.
 */
async function resolverLineas(entrada) {
  if (!Array.isArray(entrada) || !entrada.length) return { error: "Elige al menos un producto del marketplace para tu armado." };
  if (entrada.length > MAX_LINEAS) return { error: `Máximo ${MAX_LINEAS} productos por solicitud.` };
  const pedidas = new Map();
  for (const raw of entrada) {
    const id = Number(raw && (raw.id_producto ?? raw.id));
    if (!Number.isInteger(id) || id <= 0) return { error: "Una de las líneas no tiene un producto válido del catálogo." };
    const cantidad = Math.max(1, Math.min(MAX_CANTIDAD, Math.floor(Number(raw.cantidad)) || 1));
    const previa = pedidas.get(id);
    pedidas.set(id, {
      cantidad: Math.min(MAX_CANTIDAD, (previa ? previa.cantidad : 0) + cantidad),
      declarado: raw.precio !== undefined && raw.precio !== null && raw.precio !== "" ? Number(raw.precio) : (previa ? previa.declarado : null),
    });
  }
  const productos = await Producto.scope("allBusinesses").findAll({ where: { id_producto: [...pedidas.keys()] } });
  const porId = new Map(productos.map((p) => [p.id_producto, p]));
  const lineas = [];
  for (const [id, pedida] of pedidas) {
    const p = porId.get(id);
    if (!p) return { error: `El producto #${id} ya no está disponible en el catálogo. Actualiza tu selección.` };
    const precio = precioVigente(p);
    const linea = { id_producto: id, nombre: p.nombre, cantidad: pedida.cantidad, precio, stock_momento: Number(p.stock || 0) };
    if (Number.isFinite(pedida.declarado) && Math.abs(pedida.declarado - precio) > 0.01) linea.precio_declarado = S.round2(pedida.declarado);
    lineas.push(linea);
  }
  return { lineas };
}

const totales = (lineas) => {
  const total = S.round2((lineas || []).reduce((s, l) => s + Number(l.precio || 0) * Number(l.cantidad || 1), 0));
  const subtotal = S.round2(total / (1 + S.IGV));
  return { subtotal_sin_igv: subtotal, igv: S.round2(total - subtotal), total_catalogo: total };
};

// Líneas visibles para el cliente: sin ids internos, stock ni precio declarado.
const lineasPublicas = (lineas) => (Array.isArray(lineas) ? lineas : []).map((l) => ({ nombre: l.nombre, cantidad: l.cantidad, precio: Number(l.precio) }));

// Para el admin: añade precio y stock vigentes del catálogo (consulta única por lote).
async function enriquecer(filas) {
  const ids = new Set();
  for (const f of filas) for (const l of Array.isArray(f.productos) ? f.productos : []) if (l && l.id_producto) ids.add(Number(l.id_producto));
  const porId = new Map();
  if (ids.size) (await Producto.scope("allBusinesses").findAll({ where: { id_producto: [...ids] } })).forEach((p) => porId.set(p.id_producto, p));
  return (productos) => (Array.isArray(productos) ? productos : []).map((l) => {
    const p = porId.get(Number(l.id_producto));
    const actual = p ? precioVigente(p) : null;
    return {
      ...l,
      precio: Number(l.precio),
      precio_actual: actual,
      stock_actual: p ? Number(p.stock || 0) : null,
      disponible: p ? Number(p.stock || 0) >= Number(l.cantidad) : false,
      precio_cambio: actual !== null && Math.abs(actual - Number(l.precio)) > 0.01,
    };
  });
}

module.exports = { resolverLineas, totales, lineasPublicas, enriquecer, precioVigente, MAX_LINEAS };
