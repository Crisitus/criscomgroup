'use strict';
// Logica unica de ofertas: la usan ofertasDelDia.controller, producto.controller y el script de reconciliacion.
const { sequelize, Producto, Oferta } = require('../models');

const IGV_RATE = 0.18; // mismo valor que producto.controller
const round2 = (n) => Number(Number(n).toFixed(2));

const derivarDescuento = (normalConIgv, ofertaConIgv) => {
  const normal = Number(normalConIgv);
  const oferta = Number(ofertaConIgv);
  if (!(normal > 0) || !(oferta > 0) || oferta >= normal) return null;
  return Math.max(0.01, round2((1 - oferta / normal) * 100));
};

// Valida un item {id_producto, descuento?, precio_fijo?} contra el producto. Devuelve {descuento, precioConIgv, precioNeto} o {error}.
const calcularOferta = (producto, item) => {
  const normal = Number(producto.precio_unitario_con_igv);
  if (!(normal > 0)) return { error: 'El producto no tiene precio normal valido' };
  let precioConIgv;
  if (item.precio_fijo !== undefined && item.precio_fijo !== null && item.precio_fijo !== '') {
    const fijo = Number(item.precio_fijo);
    if (!Number.isFinite(fijo) || fijo <= 0) return { error: "'precio_fijo' debe ser un numero mayor a 0" };
    if (round2(fijo) >= normal) return { error: `'precio_fijo' (${round2(fijo)}) debe ser menor al precio normal con IGV (${normal})` };
    precioConIgv = round2(fijo);
  } else {
    const d = item.descuento;
    if (typeof d !== 'number' || !Number.isFinite(d) || d < 1 || d > 99) return { error: "Debe enviar 'precio_fijo' o 'descuento' (1-99)" };
    precioConIgv = round2(normal * (1 - d / 100));
    if (!(precioConIgv > 0)) return { error: 'El descuento deja el precio en 0' };
  }
  const descuento = derivarDescuento(normal, precioConIgv);
  if (descuento === null) return { error: 'La oferta no reduce el precio normal' };
  return { descuento, precioConIgv, precioNeto: round2(precioConIgv / (1 + IGV_RATE)) };
};

// Valida la vigencia opcional de un item. NULL/ausente = sin límite.
// Devuelve { vigente_desde, vigente_hasta } o { error }.
const validarVigencia = (item) => {
  const parse = (valor, campo) => {
    if (valor === undefined || valor === null || valor === '') return { fecha: null };
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return { error: `'${campo}' no es una fecha válida` };
    return { fecha };
  };
  const desde = parse(item.vigente_desde, 'vigente_desde');
  if (desde.error) return desde;
  const hasta = parse(item.vigente_hasta, 'vigente_hasta');
  if (hasta.error) return hasta;
  if (desde.fecha && hasta.fecha && desde.fecha > hasta.fecha) {
    return { error: "'vigente_desde' no puede ser posterior a 'vigente_hasta'" };
  }
  return { vigente_desde: desde.fecha, vigente_hasta: hasta.fecha };
};

// ¿La fila ofertas está vigente en `ahora`? NULL = sin límite (bordes inclusivos).
const esOfertaVigente = (oferta, ahora = new Date()) => {
  if (oferta.vigente_desde && new Date(oferta.vigente_desde) > ahora) return false;
  if (oferta.vigente_hasta && new Date(oferta.vigente_hasta) < ahora) return false;
  return true;
};

// Fija es_oferta + precios del producto y la fila ofertas (misma transaccion).
// Si la oferta aún no inicia, el producto NO queda marcado (caché = solo vigentes).
const escribirOferta = async (producto, calc, t) => {
  const vigente = esOfertaVigente(calc);
  producto.es_oferta = vigente;
  producto.precio_oferta_con_igv = vigente ? calc.precioConIgv : null;
  producto.precio_oferta = vigente ? calc.precioNeto : null;
  await producto.save({ transaction: t });
  await Oferta.upsert({
    id_producto: producto.id_producto,
    descuento: calc.descuento,
    vigente_desde: calc.vigente_desde ?? null,
    vigente_hasta: calc.vigente_hasta ?? null,
  }, { transaction: t });
};

// Aplica un lote de forma atomica: si algun item es invalido no se aplica NINGUNO (los validos quedan 'omitida').
const aplicarOfertas = async (items) => {
  const t = await sequelize.transaction();
  try {
    const resultados = [];
    const pendientes = [];
    const vistos = new Set();
    for (const item of items) {
      const id = Number(item && item.id_producto);
      if (!item || typeof item !== 'object' || !Number.isInteger(id) || id <= 0) {
        resultados.push({ id_producto: item && item.id_producto, estado: 'error', motivo: "Debe enviar un 'id_producto' valido" });
        continue;
      }
      if (vistos.has(id)) {
        resultados.push({ id_producto: id, estado: 'error', motivo: 'Producto repetido en el lote' });
        continue;
      }
      vistos.add(id);
      const producto = await Producto.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!producto) { resultados.push({ id_producto: id, estado: 'error', motivo: 'Producto no encontrado' }); continue; }
      const calc = calcularOferta(producto, item);
      if (calc.error) { resultados.push({ id_producto: id, estado: 'error', motivo: calc.error }); continue; }
      const vigencia = validarVigencia(item);
      if (vigencia.error) { resultados.push({ id_producto: id, estado: 'error', motivo: vigencia.error }); continue; }
      pendientes.push({ producto, calc: { ...calc, ...vigencia } });
    }
    if (resultados.some((r) => r.estado === 'error')) {
      await t.rollback();
      for (const { producto } of pendientes) {
        resultados.push({ id_producto: producto.id_producto, estado: 'omitida', motivo: 'No se aplico: otro item del lote tiene error (operacion atomica)' });
      }
      return { ok: false, resultados };
    }
    for (const { producto, calc } of pendientes) {
      await escribirOferta(producto, calc, t);
      resultados.push({ id_producto: producto.id_producto, estado: 'aplicada', motivo: null, descuento: calc.descuento, precio_oferta_con_igv: calc.precioConIgv });
    }
    await t.commit();
    return { ok: true, resultados };
  } catch (err) {
    try { await t.rollback(); } catch (_) { /* ya cerrada */ }
    throw err;
  }
};

// Quita la oferta de un producto aunque no exista fila en ofertas. Por item, en su propia transaccion.
const quitarOferta = async (idProducto) => {
  const id = Number(idProducto);
  if (!Number.isInteger(id) || id <= 0) return { id_producto: idProducto, estado: 'error', motivo: 'id_producto invalido' };
  const t = await sequelize.transaction();
  try {
    const producto = await Producto.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!producto) { await t.rollback(); return { id_producto: id, estado: 'error', motivo: 'Producto no encontrado' }; }
    const borradas = await Oferta.destroy({ where: { id_producto: id }, transaction: t });
    const tenia = borradas > 0 || producto.es_oferta || producto.precio_oferta !== null || producto.precio_oferta_con_igv !== null;
    if (!tenia) { await t.rollback(); return { id_producto: id, estado: 'omitida', motivo: 'El producto no tiene oferta' }; }
    producto.es_oferta = false;
    producto.precio_oferta = null;
    producto.precio_oferta_con_igv = null;
    await producto.save({ transaction: t });
    await t.commit();
    return { id_producto: id, estado: 'aplicada', motivo: null };
  } catch (err) {
    try { await t.rollback(); } catch (_) { /* ya cerrada */ }
    return { id_producto: id, estado: 'error', motivo: err.message };
  }
};

// Reconciliacion idempotente productos.es_oferta <-> ofertas.
const reconciliarOfertas = async () => {
  const t = await sequelize.transaction();
  const resumen = { creadas: 0, actualizadas: 0, limpiadas: 0, huerfanasEliminadas: 0 };
  try {
    const productos = await Producto.findAll({ where: { es_oferta: true }, transaction: t });
    for (const p of productos) {
      const descuento = derivarDescuento(p.precio_unitario_con_igv, p.precio_oferta_con_igv);
      if (descuento === null) {
        p.es_oferta = false; p.precio_oferta = null; p.precio_oferta_con_igv = null;
        await p.save({ transaction: t });
        const n = await Oferta.destroy({ where: { id_producto: p.id_producto }, transaction: t });
        resumen.limpiadas += 1; resumen.huerfanasEliminadas += n;
        continue;
      }
      const fila = await Oferta.findOne({ where: { id_producto: p.id_producto }, transaction: t });
      if (!fila) { await Oferta.create({ id_producto: p.id_producto, descuento }, { transaction: t }); resumen.creadas += 1; }
      else if (Math.abs(Number(fila.descuento) - descuento) > 0.01) { await fila.update({ descuento }, { transaction: t }); resumen.actualizadas += 1; }
    }
    const filas = await Oferta.findAll({ include: [{ model: Producto, as: 'producto', attributes: ['id_producto', 'es_oferta'] }], transaction: t });
    for (const f of filas) {
      if (!f.producto || !f.producto.es_oferta) { await f.destroy({ transaction: t }); resumen.huerfanasEliminadas += 1; }
    }
    await t.commit();
    return resumen;
  } catch (err) {
    try { await t.rollback(); } catch (_) { /* ya cerrada */ }
    throw err;
  }
};

// Sincroniza el caché producto.es_oferta/precio_oferta* con la vigencia real de
// la tabla ofertas (write-through "al vencer/iniciar"). Idempotente; la llaman
// las lecturas públicas (ecommerce/ofertas, catálogo, detalle) antes de leer.
const sincronizarVigenciaOfertas = async () => {
  const ahora = new Date();
  const filas = await Oferta.findAll({
    include: [{ model: Producto, as: 'producto', attributes: ['id_producto', 'es_oferta', 'precio_oferta_con_igv', 'precio_oferta', 'precio_unitario_con_igv'] }],
  });
  const resumen = { activadas: 0, desactivadas: 0 };
  for (const fila of filas) {
    const producto = fila.producto;
    if (!producto) continue;
    if (esOfertaVigente(fila, ahora)) {
      if (!producto.es_oferta) {
        const normal = Number(producto.precio_unitario_con_igv);
        if (normal > 0) {
          const precioConIgv = round2(normal * (1 - Number(fila.descuento) / 100));
          await producto.update({ es_oferta: true, precio_oferta_con_igv: precioConIgv, precio_oferta: round2(precioConIgv / (1 + IGV_RATE)) });
          resumen.activadas += 1;
        }
      }
    } else if (producto.es_oferta) {
      await producto.update({ es_oferta: false, precio_oferta: null, precio_oferta_con_igv: null });
      resumen.desactivadas += 1;
    }
  }
  // Productos marcados en caché sin fila en ofertas: el caché miente; limpiarlo.
  const huerfanos = await Producto.findAll({
    where: { es_oferta: true },
    include: [{ model: Oferta, as: 'oferta', required: false, attributes: ['id_oferta'] }],
  });
  for (const p of huerfanos) {
    if (!p.oferta) {
      await p.update({ es_oferta: false, precio_oferta: null, precio_oferta_con_igv: null });
      resumen.desactivadas += 1;
    }
  }
  return resumen;
};

module.exports = { IGV_RATE, derivarDescuento, calcularOferta, validarVigencia, esOfertaVigente, aplicarOfertas, quitarOferta, reconciliarOfertas, sincronizarVigenciaOfertas };
