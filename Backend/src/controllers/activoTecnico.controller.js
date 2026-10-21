const { Op } = require('sequelize');
const { ClienteServicio, ActivoTecnico } = require('../models');

const tenantId = req => req.user.tipo_vendedor === 'afiliado' ? Number(req.user.affiliate_business_id) : null;
const scope = req => ({ affiliate_business_id: tenantId(req) });
const actor = req => req.user.id_user || req.user.id;
const businessKey = req => tenantId(req) ? `affiliate:${tenantId(req)}` : 'central';
const clean = value => String(value || '').trim() || null;

exports.listClients = async (req, res) => {
  const where = scope(req);
  const search = clean(req.query.q);
  if (search) where[Op.or] = ['nombre', 'documento', 'telefono'].map(field => ({ [field]: { [Op.like]: `%${search}%` } }));
  res.json(await ClienteServicio.findAll({ where, include: [{ model: ActivoTecnico, as: 'activos', required: false }], order: [['nombre', 'ASC']] }));
};

exports.createClient = async (req, res) => {
  try {
    const nombre = clean(req.body.nombre);
    if (!nombre) throw new Error('El nombre del cliente es obligatorio');
    const record = await ClienteServicio.create({
      nombre, tipo_documento: clean(req.body.tipo_documento), documento: clean(req.body.documento),
      telefono: clean(req.body.telefono), email: clean(req.body.email), notas: clean(req.body.notas),
      ...scope(req), negocio_clave: businessKey(req), creado_por: actor(req),
    });
    res.status(201).json(record);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

exports.listAssets = async (req, res) => {
  const where = scope(req);
  if (req.query.cliente_id) where.id_cliente_servicio = Number(req.query.cliente_id);
  const search = clean(req.query.q);
  if (search) where[Op.or] = ['tipo', 'marca', 'modelo', 'numero_serie', 'imei', 'alias'].map(field => ({ [field]: { [Op.like]: `%${search}%` } }));
  res.json(await ActivoTecnico.findAll({ where, include: [{ model: ClienteServicio, as: 'cliente' }], order: [['actualizado_en', 'DESC']] }));
};

exports.createAsset = async (req, res) => {
  try {
    const client = await ClienteServicio.findOne({ where: { id_cliente_servicio: Number(req.body.id_cliente_servicio), ...scope(req) } });
    if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });
    const tipo = clean(req.body.tipo);
    if (!tipo) throw new Error('El tipo de activo es obligatorio');
    const record = await ActivoTecnico.create({
      id_cliente_servicio: client.id_cliente_servicio, tipo, marca: clean(req.body.marca), modelo: clean(req.body.modelo),
      numero_serie: clean(req.body.numero_serie), imei: clean(req.body.imei), color: clean(req.body.color),
      alias: clean(req.body.alias), notas: clean(req.body.notas), ...scope(req), negocio_clave: businessKey(req), creado_por: actor(req),
    });
    res.status(201).json(record);
  } catch (error) { res.status(400).json({ message: error.message }); }
};
