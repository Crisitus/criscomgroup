const { Op } = require('sequelize');
const { AccessRequest, AreaGrant, User, sequelize } = require('../models');
const { parseLimaDate, isoFields } = require('./user.controller');
const DATE_KEYS = ['expires_at', 'reviewed_at', 'created_at', 'updated_at'];

const AREAS = ['ventas', 'inventario', 'compras', 'cotizaciones', 'servicio_tecnico', 'marketing', 'auditoria', 'empresa_sunat', 'pagos_pos'];
const MAX_GRANT_DAYS = 30; // un permiso de area siempre caduca: tope de 30 dias, renovable con otra solicitud
const REQUESTER_ROLES = [1, 2, 3, 5, 6]; // el cliente ecommerce (rol 4) no solicita areas del ERP

const fail = (res, status, message, extra = {}) => res.status(status).json({ message, error: message, ...extra });
const safe = (handler, label) => async (req, res) => {
  try {
    return await handler(req, res);
  } catch (error) {
    console.error(`Error en access.${label}:`, error);
    return fail(res, 500, 'No se pudo completar la operación');
  }
};
const activeGrantWhere = (extra = {}) => ({ active: true, [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: new Date() } }], ...extra });
const grantState = (grant, now = new Date()) => {
  if (!grant) return null;
  if (!grant.active) return 'revocado';
  if (grant.expires_at && new Date(grant.expires_at) <= now) return 'vencido';
  return 'activo';
};

exports.my = safe(async (req, res) => {
  const userId = req.user.id_user;
  const [grants, requests] = await Promise.all([
    AreaGrant.findAll({ where: activeGrantWhere({ user_id: userId }) }),
    AccessRequest.findAll({ where: { user_id: userId }, order: [['created_at', 'DESC']], limit: 100 }),
  ]);
  res.json({ areas: AREAS, grants, requests });
}, 'my');

exports.request = safe(async (req, res) => {
  if (!REQUESTER_ROLES.includes(Number(req.user.id_role))) return fail(res, 403, 'Tu tipo de cuenta no puede solicitar áreas del ERP');
  const area = String(req.body.area || '');
  const reason = String(req.body.reason || '').trim();
  if (!AREAS.includes(area)) return fail(res, 422, 'Área no delegable', { errores: { area: 'Área no delegable' } });
  if (reason.length < 5 || reason.length > 500) return fail(res, 422, 'Explica por qué necesitas el acceso (5 a 500 caracteres)', { errores: { reason: 'Entre 5 y 500 caracteres' } });
  const [item, created] = await AccessRequest.findOrCreate({ where: { user_id: req.user.id_user, area, status: 'pending' }, defaults: { user_id: req.user.id_user, area, reason } });
  if (!created) await item.update({ reason });
  res.status(created ? 201 : 200).json(item);
}, 'request');

// GET /access/requests?status=&page=&limit= -> arreglo; total en la cabecera X-Total-Count.
exports.list = safe(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
  const where = {};
  if (['pending', 'approved', 'rejected'].includes(req.query.status)) where.status = req.query.status;
  const { rows, count } = await AccessRequest.findAndCountAll({
    where,
    include: [{ model: User, as: 'requester', attributes: ['id_user', 'name', 'email', 'id_role'] }],
    order: [['created_at', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
  const approved = rows.filter((row) => row.status === 'approved');
  const grants = approved.length ? await AreaGrant.findAll({ where: { user_id: approved.map((row) => row.user_id) } }) : [];
  const byKey = new Map(grants.map((grant) => [`${grant.user_id}:${grant.area}`, grant]));
  res.set('X-Total-Count', String(count));
  res.json(rows.map((row) => {
    const json = isoFields(row.toJSON(), DATE_KEYS);
    const grant = row.status === 'approved' ? byKey.get(`${row.user_id}:${row.area}`) : null;
    json.permiso = grant ? { id_grant: grant.id_grant, estado: grantState(grant), expires_at: isoFields({ expires_at: grant.expires_at }, ['expires_at']).expires_at } : null;
    return json;
  }));
}, 'list');

// GET /access/grants?estado=activo|vencido|revocado|todos -> permisos concedidos (para poder revocarlos).
exports.grants = safe(async (req, res) => {
  const estado = String(req.query.estado || 'activo');
  const where = {};
  const now = new Date();
  if (estado === 'activo') Object.assign(where, activeGrantWhere());
  else if (estado === 'revocado') where.active = false;
  else if (estado === 'vencido') Object.assign(where, { active: true, expires_at: { [Op.lte]: now } });
  const grants = await AreaGrant.findAll({ where, order: [['updated_at', 'DESC']], limit: 200 });
  const users = grants.length ? await User.findAll({ attributes: ['id_user', 'name', 'email', 'id_role'], where: { id_user: [...new Set(grants.map((grant) => grant.user_id))] } }) : [];
  const byId = new Map(users.map((user) => [user.id_user, user]));
  res.json(grants.map((grant) => ({ ...isoFields(grant.toJSON(), DATE_KEYS), estado: grantState(grant, now), user: byId.get(grant.user_id) || null })));
}, 'grants');

// Solo la maestra real (la ruta exige exactMaster). Solo se aprueba una solicitud pendiente, con vigencia obligatoria
// (futura y de maximo 30 dias). Rechazar una aprobada equivale a revocar su permiso.
exports.resolve = safe(async (req, res) => {
  if (!req.isExactMaster) return fail(res, 403, 'Solo la cuenta maestra aprueba accesos especiales');
  const status = String(req.body.status || '');
  if (!['approved', 'rejected'].includes(status)) return fail(res, 422, 'Estado inválido: usa approved o rejected', { errores: { status: 'approved o rejected' } });
  const item = await AccessRequest.findByPk(Number(req.params.id));
  if (!item) return fail(res, 404, 'Solicitud no encontrada');
  const note = req.body.review_note ? String(req.body.review_note).slice(0, 500) : null;
  if (status === 'approved') {
    if (item.status !== 'pending') return fail(res, 409, 'La solicitud ya fue resuelta');
    const expires = parseLimaDate(req.body.expires_at);
    const limit = new Date(Date.now() + MAX_GRANT_DAYS * 86400000);
    if (!expires || expires <= new Date() || expires > limit) {
      return fail(res, 422, `La vigencia es obligatoria, futura y de máximo ${MAX_GRANT_DAYS} días`, { errores: { expires_at: `Obligatoria, futura y de máximo ${MAX_GRANT_DAYS} días` } });
    }
    await sequelize.transaction(async (transaction) => {
      await item.update({ status: 'approved', reviewed_by: req.user.id_user, reviewed_at: new Date(), expires_at: expires, review_note: note }, { transaction });
      await AreaGrant.upsert({ user_id: item.user_id, area: item.area, expires_at: expires, granted_by: req.user.id_user, active: true }, { transaction });
    });
  } else {
    if (item.status === 'rejected') return fail(res, 409, 'La solicitud ya estaba rechazada');
    await sequelize.transaction(async (transaction) => {
      if (item.status === 'approved') await AreaGrant.update({ active: false }, { where: { user_id: item.user_id, area: item.area }, transaction });
      await item.update({ status: 'rejected', reviewed_by: req.user.id_user, reviewed_at: new Date(), expires_at: null, review_note: note }, { transaction });
    });
  }
  await item.reload();
  res.json(isoFields(item.toJSON(), DATE_KEYS));
}, 'resolve');

exports.revoke = safe(async (req, res) => {
  if (!req.isExactMaster) return fail(res, 403, 'Solo la cuenta maestra revoca accesos');
  const item = await AreaGrant.findByPk(Number(req.params.id));
  if (!item) return fail(res, 404, 'Permiso no encontrado');
  await item.update({ active: false });
  res.json({ success: true });
}, 'revoke');
