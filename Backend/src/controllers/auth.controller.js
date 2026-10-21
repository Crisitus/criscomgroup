const User = require("../models/user.model")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { validationResult } = require("express-validator")
const { Op } = require('sequelize')
const { AreaGrant } = require('../models')
const { OAuth2Client } = require('google-auth-library')
const crypto = require('crypto')
const { createStaffUser } = require('./user.controller')
const { isMasterEmail, isFuture } = require('../middlewares/master.middleware')
const DUMMY_PASSWORD_HASH = "$2a$10$JqgB5Jml5QZBfXvXWVY7eO2b2P7vPDlGvB2V3pZ2cUolrG.6Z4C6K"

const activeAreas = async (userId) => (await AreaGrant.findAll({
  attributes: ['area'],
  where: {
    user_id: userId,
    active: true,
    [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: new Date() } }],
  },
})).map((item) => item.area)

// Datos de sesion que ve el front. `es_maestra` lo calcula el servidor (MASTER_ADMIN_EMAIL): el front no conoce el correo.
const sessionUser = (user, areaGrants) => ({
  id: user.id_user,
  id_user: user.id_user,
  name: user.name,
  email: user.email,
  id_role: user.id_role,
  tipo_vendedor: user.tipo_vendedor,
  acceso_expira_en: user.acceso_expira_en,
  superusuario_temporal: Boolean(user.superusuario_temporal && isFuture(user.superusuario_expira_en)),
  superusuario_expira_en: user.superusuario_expira_en,
  area_grants: areaGrants,
  affiliate_business_id: user.affiliate_business_id,
  es_maestra: Number(user.id_role) === 1 && isMasterEmail(user.email),
})

// `tv` = version de sesion: un cambio de clave, de rol o una desactivacion invalida los JWT anteriores.
const signSession = (user) => jwt.sign(
  { id: user.id_user, id_role: user.id_role, tipo_vendedor: user.tipo_vendedor, tv: Number(user.token_version || 0) },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
)

const buildAuthResponse = async (user) => ({
  success: true,
  token: signSession(user),
  user: sessionUser(user, await activeAreas(user.id_user)),
})

// Alta de personal por un gerente / rol 2 elevado. Usa EXACTAMENTE la misma funcion que POST /users
// (un rol 2 normal ya no pasa; el rol 1 nunca se crea; el rol 2 solo lo crea un gerente).
exports.register = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() })
  }
  try {
    const result = await createStaffUser(req, {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      id_role: req.body.id_role,
    })
    if (result.status >= 400) {
      return res.status(result.status).json({ success: false, msg: result.body.message, ...result.body })
    }
    return res.json({
      success: true,
      msg: "Usuario creado exitosamente",
      user: { id: result.user.id_user, id_user: result.user.id_user, name: result.user.name, email: result.user.email, id_role: result.user.id_role },
    })
  } catch (error) {
    console.error('Error en register:', error)
    res.status(500).json({ success: false, msg: "Hubo un error en el servidor" })
  }
}

// Registro publico del ecommerce. El rol se fija en el servidor para impedir
// que un visitante pueda crear cuentas con acceso al ERP.
exports.registerCustomer = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() })
  }

  const name = String(req.body.name || "").trim()
  const email = String(req.body.email || "").trim().toLowerCase()
  const { password } = req.body

  try {
    const existingUser = await User.findOne({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ success: false, msg: "No se pudo crear la cuenta con esos datos" })
    }

    const hashPassword = await bcrypt.hash(password, 10)
    const user = await User.create({
      name,
      email,
      password: hashPassword,
      id_role: 4,
    })

    if (req.body.comunidad === true) {
      try {
        const { upsertSubscriber } = require('./community.controller');
        await upsertSubscriber({ email, nombre: name, fuente: 'registro', userId: user.id_user, consentText: 'Acepto recibir comunicaciones de CRISCOM (casilla del registro)', ip: req.ip });
      } catch (error) {
        console.error('[auth] No se pudo registrar al cliente en la comunidad:', error.message)
      }
    }

    const token = jwt.sign(
      { id: user.id_user, id_role: user.id_role, tv: Number(user.token_version || 0) },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
    )

    res.set("Cache-Control", "no-store")
    return res.status(201).json({
      success: true,
      msg: "Cuenta creada exitosamente",
      token,
      user: {
        id: user.id_user,
        id_user: user.id_user,
        name: user.name,
        email: user.email,
        id_role: user.id_role,
      },
    })
  } catch (error) {
    console.error("Error en registerCustomer:", error)
    return res.status(500).json({ success: false, msg: "Hubo un error en el servidor" })
  }
}

exports.login = async (req, res) => {
  // El correo es el único identificador público de acceso.
  const email = String(req.body.email || "").trim().toLowerCase()
  const { password } = req.body

  if (!email || !password) {
    return res.status(400).json({ msg: "Correo y contraseña son obligatorios" })
  }

  try {
    // Revisar que sea un usuario registrado
    const user = await User.findOne({ where: { email } })

    // Revisar el password
    const correctPassword = await bcrypt.compare(password, user ? user.password : DUMMY_PASSWORD_HASH)
    if (!user || !correctPassword) {
      return res.status(401).json({ msg: "Credenciales incorrectas" })
    }
    if (user.activo === false) {
      return res.status(403).json({ code: 'ACCOUNT_DISABLED', msg: 'La cuenta está desactivada. Contacta al administrador' })
    }
    if (user.id_role === 5 && !isFuture(user.acceso_expira_en)) {
      return res.status(403).json({ code: 'TEMPORARY_ACCESS_EXPIRED', msg: 'El acceso temporal ha caducado' })
    }
    res.set("Cache-Control", "no-store")
    return res.json(await buildAuthResponse(user))
  } catch (error) {
    console.error('Error en login:', error)
    res.status(500).json({ msg: "Hubo un error" })
  }
}

// Sesion actual (el front la usa para refrescar permisos y es_maestra sin conocer el correo maestro).
exports.me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id)
    if (!user) return res.status(401).json({ msg: 'La cuenta ya no existe' })
    res.set("Cache-Control", "no-store")
    return res.json({ success: true, user: sessionUser(user, await activeAreas(user.id_user)) })
  } catch (error) {
    console.error('Error en me:', error)
    return res.status(500).json({ msg: 'No se pudo cargar la sesión' })
  }
}

exports.googleLogin = async (req, res) => {
  const credential = String(req.body.credential || '').trim()
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim()

  if (!clientId) {
    return res.status(503).json({ success: false, msg: 'El acceso con Google todavía no está configurado' })
  }
  if (!credential) {
    return res.status(400).json({ success: false, msg: 'Falta la credencial de Google' })
  }

  try {
    const ticket = await new OAuth2Client(clientId).verifyIdToken({
      idToken: credential,
      audience: clientId,
    })
    const profile = ticket.getPayload()
    const email = String(profile?.email || '').trim().toLowerCase()

    if (!profile?.sub || !email || profile.email_verified !== true) {
      return res.status(401).json({ success: false, msg: 'Google no pudo verificar este correo' })
    }

    let user = await User.findOne({ where: { email } })
    if (!user) {
      const generatedPassword = await bcrypt.hash(crypto.randomBytes(48).toString('base64url'), 12)
      user = await User.create({
        name: String(profile.name || email.split('@')[0]).trim().slice(0, 255),
        email,
        password: generatedPassword,
        id_role: 4,
      })
    }

    if (user.activo === false) {
      return res.status(403).json({ success: false, code: 'ACCOUNT_DISABLED', msg: 'La cuenta está desactivada. Contacta al administrador' })
    }
    if (user.id_role === 5 && !isFuture(user.acceso_expira_en)) {
      return res.status(403).json({ success: false, code: 'TEMPORARY_ACCESS_EXPIRED', msg: 'El acceso temporal ha caducado' })
    }

    res.set('Cache-Control', 'no-store')
    return res.json(await buildAuthResponse(user))
  } catch (error) {
    console.error('Error en googleLogin:', error?.message || error)
    return res.status(401).json({ success: false, msg: 'No se pudo validar el acceso con Google' })
  }
}
