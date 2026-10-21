const { CierreCaja, User, Venta } = require('../models');
const { Op } = require('sequelize');

// M1: los totales del cierre se calculan en el servidor desde Venta; el cliente
// solo declara el conteo fisico (saldo_efectivo). pago_link/metodos mixtos
// ('a+b' de ordenes de servicio) no caben en los 5 buckets: se suman aparte y
// se anotan en observaciones para que el cuadre sea completo.
const scopedModel = (req) => req.user.affiliate_business_id ? CierreCaja.unscoped() : CierreCaja;
const accessWhere = (req, extra = {}) => req.user.affiliate_business_id
  ? { ...extra, affiliate_business_id: req.user.affiliate_business_id }
  : req.user.id_role === 3 ? { ...extra, cajero_id: req.user.id_user, affiliate_business_id: null } : { ...extra, affiliate_business_id: null };

const cierreCajaController = {
  // Crear un cierre de caja
  create: async (req, res) => {
    try {
      const { fecha_apertura, fecha_cierre, cajero_id, saldo_efectivo, estado, observaciones } = req.body;

      if (!fecha_apertura || !fecha_cierre) {
        return res.status(400).json({ message: 'fecha_apertura y fecha_cierre son obligatorias' });
      }
      const desde = new Date(fecha_apertura);
      const hasta = new Date(fecha_cierre);
      if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime()) || hasta <= desde) {
        return res.status(400).json({ message: 'Rango de fechas inválido' });
      }
      const cajeroId = req.user.id_role === 3 ? req.user.id_user : Number(cajero_id);
      if (!Number.isInteger(cajeroId) || cajeroId <= 0) {
        return res.status(400).json({ message: 'Cajero no válido' });
      }

      // Cuadre server-side: totales reales desde Venta (los enviados por el cliente se ignoran)
      const VentaScoped = req.user.affiliate_business_id ? Venta.unscoped() : Venta;
      const ventas = await VentaScoped.findAll({
        where: {
          id_cajero: cajeroId,
          fecha: { [Op.between]: [desde, hasta] },
          ...(req.user.affiliate_business_id ? { affiliate_business_id: req.user.affiliate_business_id } : {}),
        },
        attributes: ['metodo_pago', 'total_con_igv'],
      });
      const totales = { efectivo: 0, tarjeta: 0, transferencia: 0, yape: 0, plin: 0 };
      let otros = 0;
      for (const venta of ventas) {
        const metodo = String(venta.metodo_pago || '');
        const monto = Number(venta.total_con_igv) || 0;
        if (Object.prototype.hasOwnProperty.call(totales, metodo)) totales[metodo] += monto;
        else otros += monto;
      }
      const notaOtros = otros > 0 ? `Métodos mixtos/otros (pago_link, combinados): S/ ${otros.toFixed(2)}` : null;
      const observacionesFinal = [observaciones, notaOtros].filter(Boolean).join(' | ') || null;

      const cierre = await CierreCaja.create({
        fecha_apertura: desde,
        fecha_cierre: hasta,
        cajero_id: cajeroId,
        affiliate_business_id: req.user.affiliate_business_id || null,
        saldo_efectivo,
        total_efectivo: Number(totales.efectivo.toFixed(2)),
        total_tarjeta: Number(totales.tarjeta.toFixed(2)),
        total_transferencia: Number(totales.transferencia.toFixed(2)),
        total_yape: Number(totales.yape.toFixed(2)),
        total_plin: Number(totales.plin.toFixed(2)),
        cantidad_ventas: ventas.length,
        estado,
        observaciones: observacionesFinal
      });
      return res.status(201).json({ message: 'Cierre de caja registrado', cierre });
    } catch (error) {
      return res.status(500).json({ message: 'Error al crear cierre de caja', error: error.message });
    }
  },

  // Obtener todos los cierres de caja
  getAll: async (req, res) => {
    try {
      const cierres = await scopedModel(req).findAll({ where: accessWhere(req), order: [['fecha_apertura', 'DESC']] });
      return res.status(200).json(cierres);
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener cierres de caja', error: error.message });
    }
  },

  // Obtener cierre de caja por ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const cierre = await scopedModel(req).findOne({ where: accessWhere(req, { id_cierre: id }) });
      if (!cierre) return res.status(404).json({ message: 'Cierre de caja no encontrado' });
      return res.status(200).json(cierre);
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener cierre de caja', error: error.message });
    }
  },

  // Actualizar cierre de caja
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const cierre = await scopedModel(req).findOne({ where: accessWhere(req, { id_cierre: id }) });
      if (!cierre) return res.status(404).json({ message: 'Cierre de caja no encontrado' });
      // Si en el body viene monto_total, cambiarlo a saldo_efectivo
      if (req.body.monto_total !== undefined) {
        req.body.saldo_efectivo = req.body.monto_total;
        delete req.body.monto_total;
      }
      // Los totales y la cantidad los calcula el servidor (M1): no se aceptan del cliente
      for (const campo of ['total_efectivo', 'total_tarjeta', 'total_transferencia', 'total_yape', 'total_plin', 'cantidad_ventas'])
        delete req.body[campo];
      await cierre.update(req.body);
      return res.status(200).json({ message: 'Cierre de caja actualizado', cierre });
    } catch (error) {
      return res.status(500).json({ message: 'Error al actualizar cierre de caja', error: error.message });
    }
  },

  // Eliminar cierre de caja
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const cierre = await scopedModel(req).findOne({ where: accessWhere(req, { id_cierre: id }) });
      if (!cierre) return res.status(404).json({ message: 'Cierre de caja no encontrado' });
      await cierre.destroy();
      return res.status(200).json({ message: 'Cierre de caja eliminado' });
    } catch (error) {
      return res.status(500).json({ message: 'Error al eliminar cierre de caja', error: error.message });
    }
  },

  // Obtener cierres de caja por cajero
  getByCajero: async (req, res) => {
    try {
      const { cajero_id } = req.params;
      const cierres = await scopedModel(req).findAll({
        where: accessWhere(req, { cajero_id: req.user.id_role === 3 ? req.user.id_user : cajero_id }),
        order: [['fecha_apertura', 'DESC']]
      });
      return res.status(200).json(cierres);
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener cierres por cajero', error: error.message });
    }
  },

  // Obtener cierres de caja por rango de fechas
  getByDateRange: async (req, res) => {
    try {
      const { fechaInicio, fechaFin } = req.query;
      if (!fechaInicio || !fechaFin) {
        return res.status(400).json({ message: 'Debe proporcionar fechaInicio y fechaFin' });
      }
      // Sumar un día a la fechaFin para incluir todo el día final
      const fechaFinObj = new Date(fechaFin);
      fechaFinObj.setDate(fechaFinObj.getDate() + 1);
      const fechaFinInclusive = fechaFinObj.toISOString().split('T')[0];
      const cierres = await scopedModel(req).findAll({
        where: accessWhere(req, {
          fecha_apertura: {
            [Op.gte]: fechaInicio,
            [Op.lt]: fechaFinInclusive
          }
        }),
        order: [['fecha_apertura', 'DESC']]
      });
      return res.status(200).json(cierres);
    } catch (error) {
      return res.status(500).json({ message: 'Error al obtener cierres por rango de fechas', error: error.message });
    }
  }
};

module.exports = cierreCajaController;
