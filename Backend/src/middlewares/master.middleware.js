const User = require('../models/user.model')

// Fuente unica de verdad de la cuenta maestra: variable MASTER_ADMIN_EMAIL (servidor).
// Hay tres niveles distintos, no intercambiables:
//   - maestra real:   rol 1 con ese correo         -> req.isExactMaster
//   - gerente:        cualquier rol 1              -> middleware `manager`
//   - rol 2 elevado:  superusuario temporal vigente -> req.isElevated
const getMasterEmail = () => String(process.env.MASTER_ADMIN_EMAIL || '').trim().toLowerCase()
// Con MySQL las fechas llegan como texto en hora de pared de Lima ("2026-10-12 10:00:00", sin zona).
// new Date() las leeria como UTC y adelantaria 5 h las caducidades: se interpretan siempre en -05:00.
const limaInstant = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const text = String(value).trim();
  const naive = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(text);
  const date = new Date(naive ? `${text.replace(' ', 'T')}-05:00` : text);
  return Number.isNaN(date.getTime()) ? null : date;
};
const isFuture = (value) => { const date = limaInstant(value); return Boolean(date) && date > new Date(); };
const isMasterEmail = (email) => {
  const configured = getMasterEmail()
  return Boolean(configured) && String(email || '').trim().toLowerCase() === configured
}
const isExactMasterUser = (user) => Boolean(user && Number(user.id_role) === 1 && isMasterEmail(user.email))
const isElevatedUser = (user) => Boolean(
  user && Number(user.id_role) === 2 && user.superusuario_temporal
  && isFuture(user.superusuario_expira_en),
)
// Cuenta protegida: nadie puede editarla, desactivarla ni borrarla desde /users/:id.
const isProtectedAccount = (user) => Boolean(user && (Number(user.id_role) === 1 || isMasterEmail(user.email)))

const ATTRS = ['id_user', 'email', 'id_role', 'activo', 'superusuario_temporal', 'superusuario_expira_en']

const loadActor = async (req) => (req.user?.id ? User.findByPk(req.user.id, { attributes: ATTRS }) : null)

const deny = (res, message = 'Acceso denegado') => res.status(403).json({ message })

// master: maestra real O rol 2 elevado (compatibilidad). Las rutas sensibles
// encadenan ademas `exactMaster` para excluir al rol 2 elevado.
const master = async (req, res, next) => {
  try {
    if (!getMasterEmail()) return deny(res)
    const user = await loadActor(req)
    if (!user || user.activo === false) return deny(res)
    const exact = isExactMasterUser(user)
    const elevated = isElevatedUser(user)
    if (!exact && !elevated) return deny(res)
    req.masterUser = user
    req.isExactMaster = exact
    req.isElevated = elevated
    return next()
  } catch (error) {
    console.error('Error al verificar cuenta maestra:', error)
    return res.status(500).json({ message: 'No se pudo verificar el acceso' })
  }
}

// exactMaster: SOLO la maestra real (rol 1 + correo configurado). Excluye al rol 2 elevado.
const exactMaster = async (req, res, next) => {
  try {
    if (!getMasterEmail()) return deny(res)
    const user = await loadActor(req)
    if (!user || user.activo === false || !isExactMasterUser(user)) {
      return deny(res, 'Esta función está disponible únicamente para la cuenta maestra')
    }
    req.masterUser = user
    req.isExactMaster = true
    req.isElevated = false
    return next()
  } catch (error) {
    console.error('Error al validar la cuenta maestra:', error)
    return res.status(500).json({ message: 'No se pudo verificar el acceso' })
  }
}

// manager: cualquier gerente (rol 1) o rol 2 elevado, releido de la BD (no del JWT).
const manager = async (req, res, next) => {
  try {
    const user = await loadActor(req)
    const isManager = user && user.activo !== false && Number(user.id_role) === 1
    const elevated = isElevatedUser(user) && user.activo !== false
    if (!isManager && !elevated) return deny(res)
    req.masterUser = user
    req.isExactMaster = isExactMasterUser(user)
    req.isElevated = Boolean(elevated)
    return next()
  } catch (error) {
    console.error('Error al verificar gerente:', error)
    return res.status(500).json({ message: 'No se pudo verificar el acceso' })
  }
}

module.exports = master
module.exports.master = master
module.exports.exactMaster = exactMaster
module.exports.manager = manager
module.exports.getMasterEmail = getMasterEmail
module.exports.isMasterEmail = isMasterEmail
module.exports.isExactMasterUser = isExactMasterUser
module.exports.isElevatedUser = isElevatedUser
module.exports.isProtectedAccount = isProtectedAccount
module.exports.limaInstant = limaInstant
module.exports.isFuture = isFuture
