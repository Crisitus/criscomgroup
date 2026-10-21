const { AuditLog } = require("../models")
const jwt = require("jsonwebtoken")

// ---------------------------------------------------------------------------
// Redaccion de secretos (recursiva, por patron de clave y por forma del valor)
// ---------------------------------------------------------------------------
const SECRET_KEY_RE = new RegExp(
  [
    "pass", "pwd", "contrase", "clave", "secret", "token", "authorization", "bearer",
    "api[_-]?key", "apikey", "access[_-]?key", "private[_-]?key", "(^|_)key$", "llave",
    "certificad", "(^|_)cert($|_)", "hash", "(^|_)sol_", "client[_-]?secret", "cvv", "(^|_)pin$",
    "(^|_)otp$", "firma", "credencial", "cookie", "(^|_)salt($|_)",
  ].join("|"),
  "i",
)
const BCRYPT_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/
const JWT_RE = /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/
const REDACTED = "[REDACTADO]"
const MAX_DEPTH = 8
const MAX_BYTES = 16000

const PII_TABLES = new Set(["solicitudes_postventa", "libro_reclamaciones"])
const PII_EMAIL_RE = /mail|correo/i
const PII_PHONE_RE = /tel[eé]fono|celular|phone|whatsapp/i

const maskEmail = (v) => String(v).replace(/^(.).*(@.*)$/, "$1***$2")
const maskPhone = (v) => {
  const s = String(v)
  return s.length > 3 ? `${"*".repeat(s.length - 3)}${s.slice(-3)}` : "***"
}

const sanitizeAuditData = (value, opts = {}, depth = 0) => {
  if (value === null || value === undefined) return value
  if (typeof value === "string") return BCRYPT_RE.test(value) || JWT_RE.test(value) ? REDACTED : value
  if (typeof value !== "object") return value
  if (depth >= MAX_DEPTH) return "[PROFUNDIDAD_MAXIMA]"
  if (value instanceof Date) return value.toISOString()
  if (typeof value.toJSON === "function") return sanitizeAuditData(value.toJSON(), opts, depth)
  if (Array.isArray(value)) return value.slice(0, 200).map((v) => sanitizeAuditData(v, opts, depth + 1))
  const out = {}
  for (const [key, nested] of Object.entries(value)) {
    if (SECRET_KEY_RE.test(key)) {
      out[key] = REDACTED
    } else if (opts.pii && nested && typeof nested !== "object" && PII_EMAIL_RE.test(key)) {
      out[key] = maskEmail(nested)
    } else if (opts.pii && nested && typeof nested !== "object" && PII_PHONE_RE.test(key)) {
      out[key] = maskPhone(nested)
    } else {
      out[key] = sanitizeAuditData(nested, opts, depth + 1)
    }
  }
  return out
}

// Serializa limitando el tamano; el JSON resultante siempre es valido.
const toStoredJson = (data) => {
  if (data === null || data === undefined) return null
  let text = JSON.stringify(data)
  if (text && text.length > MAX_BYTES) {
    text = JSON.stringify({ _truncado: true, _bytes: text.length, parcial: text.slice(0, 4000) })
  }
  return text
}

// ---------------------------------------------------------------------------
// Normalizacion de nombres de tabla / modulo
// ---------------------------------------------------------------------------
const TABLA_ALIASES = {
  users: "usuarios", user: "usuarios", usuario: "usuarios",
  companies: "empresas", company: "empresas", empresa: "empresas",
  products: "productos", producto: "productos",
  sales: "ventas", venta: "ventas",
  orders: "pedidos", pedido: "pedidos",
  categories: "categorias", categoria: "categorias",
  purchases: "compras", compra: "compras",
  suppliers: "proveedores",
  quotes: "cotizaciones",
  "cierre_caja": "cierres_caja", "cierres-caja": "cierres_caja",
  "codigo_barras": "codigos_barras",
  "blog": "blog_posts",
}
const normalizeTabla = (tabla) => {
  const t = String(tabla || "").trim().toLowerCase()
  return TABLA_ALIASES[t] || t
}
// Todos los nombres crudos que normalizan a `tabla` (para filtrar filas historicas).
const tablaVariants = (tabla) => {
  const n = normalizeTabla(tabla)
  return [n, ...Object.keys(TABLA_ALIASES).filter((k) => TABLA_ALIASES[k] === n)]
}

// ---------------------------------------------------------------------------
// Utilidades de request / registro afectado
// ---------------------------------------------------------------------------
const cleanIp = (ip) => String(ip || "").replace(/^::ffff:/, "").slice(0, 50) || null
const INT_MAX = 2147483647
const asRegistro = (value) => {
  if (value === null || value === undefined || value === "") return { registro_id: null, registro_ref: null }
  const s = String(value).trim()
  if (/^\d+$/.test(s) && Number(s) > 0 && Number(s) <= INT_MAX) return { registro_id: Number(s), registro_ref: null }
  return { registro_id: null, registro_ref: s.slice(0, 64) }
}

const ID_EXCLUDE = new Set(["id_user", "id_role", "id_company", "id_cajero", "id_usuario", "usuario_id", "cajero_id"])
const singular = (tabla) => String(tabla).replace(/s(_|$)/, "$1")

const idFromResponse = (parsed, tabla) => {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null
  const s = singular(tabla)
  const nested = Object.values(parsed).filter((v) => v && typeof v === "object" && !Array.isArray(v))
  for (const obj of [parsed, ...nested]) {
    for (const key of ["registro_id", "id", `${s}_id`, `id_${s}`, `id_${s.split("_")[0]}`]) {
      const v = obj[key]
      if (typeof v === "number" || (typeof v === "string" && v !== "")) return v
    }
  }
  const candidates = Object.entries(parsed).filter(
    ([k, v]) => /^id_[a-z_]+$/.test(k) && !ID_EXCLUDE.has(k) && (typeof v === "number" || /^\d+$/.test(String(v))),
  )
  return candidates.length === 1 ? candidates[0][1] : null
}

const idFromParams = (req, idParam) => {
  const p = req.params || {}
  for (const key of [idParam, "id", "venta_id", "ventaId", "pedido_id", "codigo"]) {
    if (key && p[key] !== undefined && p[key] !== "") return p[key]
  }
  const any = Object.entries(p).find(([k]) => /id$/i.test(k))
  return any ? any[1] : null
}

const userSnapshot = async (req, usuario_id) => {
  if (!usuario_id) return { usuario_nombre: null, usuario_email: null, usuario_rol: null }
  try {
    const { User } = require("../models")
    const u = await User.findByPk(usuario_id, { attributes: ["name", "email", "id_role"] })
    return {
      usuario_nombre: u ? String(u.name).slice(0, 150) : null,
      usuario_email: u ? String(u.email).slice(0, 180) : null,
      usuario_rol: u ? u.id_role : req.user?.id_role ?? null,
    }
  } catch (e) {
    return { usuario_nombre: null, usuario_email: null, usuario_rol: req.user?.id_role ?? null }
  }
}

// Registro generico (tambien lo usa el controller de logs para purga/exportacion).
const registrarEvento = async ({ req, accion, tabla, registro_id, registro_ref, antes, despues, estado_http, transaction }) => {
  const tablaN = normalizeTabla(tabla)
  const opts = { pii: PII_TABLES.has(tablaN) }
  const usuario_id = req?.user?.id || null
  const snap = await userSnapshot(req, usuario_id)
  const clean = (v) => (v === undefined || v === null ? null : toStoredJson(sanitizeAuditData(v, opts)))
  return AuditLog.create(
    {
      usuario_id,
      ...snap,
      accion: String(accion).slice(0, 50),
      tabla: tablaN.slice(0, 50),
      registro_id: registro_id ?? null,
      registro_ref: registro_ref ?? null,
      datos_anteriores: clean(antes),
      datos_nuevos: clean(despues),
      estado_http: estado_http ?? null,
      ip_cliente: cleanIp(req?.ip || req?.connection?.remoteAddress),
      user_agent: req?.headers?.["user-agent"] ? String(req.headers["user-agent"]).slice(0, 500) : null,
      fecha_hora: new Date(),
    },
    transaction ? { transaction } : undefined,
  )
}

// M9: la auditoria se escribe fuera de la transaccion de la operacion (en
// res.finish). Un fallo transitorio (deadlock, conexion) no debe perder el
// evento: se reintenta con backoff. Si los 3 intentos fallan se deja el error
// en el log (comportamiento anterior), nunca se interrumpe la respuesta.
const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const registrarEventoConReintento = async (payload, intentos = 3) => {
  let ultimoError = null
  for (let i = 0; i < intentos; i += 1) {
    try {
      return await registrarEvento(payload)
    } catch (error) {
      ultimoError = error
      if (i < intentos - 1) await esperar(250 * (2 ** i))
    }
  }
  console.error(`Error al registrar auditoría (${intentos} intentos):`, ultimoError)
  return null
}

// ---------------------------------------------------------------------------
// Captura del estado previo (PUT/PATCH/DELETE). Se sanea antes de guardarlo.
// ---------------------------------------------------------------------------
const capturarEstadoOriginal = (Model, idParam = "id") => {
  return async (req, res, next) => {
    try {
      if (req.method === "PUT" || req.method === "PATCH" || req.method === "DELETE") {
        const id = idFromParams(req, idParam) || req.body?.id
        if (id) {
          const pk = Model.primaryKeyField || Model.primaryKeyAttribute || "id"
          const where = Model.name === "CodigoBarras" && req.params.codigo ? { codigo_barras: req.params.codigo } : { [pk]: id }
          const query = { where }
          // El hash de contrasena ni siquiera se lee de la BD.
          if (Model.rawAttributes && Model.rawAttributes.password) query.attributes = { exclude: ["password"] }
          const registro = await Model.findOne(query)
          if (registro) {
            const opts = { pii: PII_TABLES.has(normalizeTabla(Model.tableName || "")) }
            req.estadoOriginal = toStoredJson(sanitizeAuditData(registro.toJSON(), opts))
            req.registro_id = registro[pk]
          }
        }
      }
    } catch (error) {
      console.error("Error al capturar estado original:", error)
    }
    next()
  }
}

// ---------------------------------------------------------------------------
// Registro de la accion. Solo se guarda si la respuesta fue exitosa (< 400).
// ---------------------------------------------------------------------------
const parseBody = (body) => {
  if (body === null || body === undefined) return null
  const text = Buffer.isBuffer(body) ? body.toString("utf8") : typeof body === "string" ? body : null
  if (!text || !/^\s*[{[]/.test(text)) return null
  try {
    return JSON.parse(text)
  } catch (e) {
    return null
  }
}

const registrarAuditoria = (accion, tabla, options = {}) => {
  return (req, res, next) => {
    const originalSend = res.send
    let responseBody = null
    res.send = function (body) {
      if (responseBody === null) responseBody = body
      res.send = originalSend
      return originalSend.apply(this, arguments)
    }

    res.once("finish", () => {
      if (res.statusCode >= 400) return // 4xx/5xx: la operacion no ocurrio, no se audita como hecha
      try {
        const parsed = parseBody(responseBody)
        const tablaN = normalizeTabla(tabla)
        const extra = res.locals && res.locals.auditoria ? res.locals.auditoria : {}
        let raw = extra.registro_id ?? req.registro_id ?? idFromParams(req, options.idParam)
        if (raw === null || raw === undefined || raw === "") raw = req.body && req.body.id
        if ((raw === null || raw === undefined || raw === "") && parsed) raw = idFromResponse(parsed, tablaN)
        const { registro_id, registro_ref } = asRegistro(raw)
        const despues = {
          ...(req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {}),
          ...(extra.despues || {}),
          _ruta: `${req.method} ${String(req.originalUrl || "").split("?")[0]}`,
        }
        registrarEventoConReintento({
          req,
          accion,
          tabla: tablaN,
          registro_id,
          registro_ref,
          antes: extra.antes !== undefined ? extra.antes : req.estadoOriginal ? JSON.parse(req.estadoOriginal) : null,
          despues,
          estado_http: res.statusCode,
        }).catch((error) => console.error("Error al registrar auditoría:", error))
      } catch (error) {
        console.error("Error al registrar auditoría:", error)
      }
    })

    next()
  }
}

// Auditoria del login exitoso (usa el token de la respuesta para saber el usuario).
const registrarLogin = async (req, res, next) => {
  const originalJson = res.json
  res.json = async function (body) {
    try {
      if (body && body.token) {
        const decoded = jwt.verify(body.token, process.env.JWT_SECRET)
        await registrarEvento({
          req: { user: { id: decoded.id }, ip: req.ip, connection: req.connection, headers: req.headers },
          accion: "login",
          tabla: "auth",
          registro_id: decoded.id,
          despues: { _ruta: "POST login" },
          estado_http: res.statusCode,
        })
      }
    } catch (error) {
      console.error("Error al registrar auditoría de login:", error)
    }
    res.json = originalJson
    return originalJson.call(this, body)
  }
  next()
}

module.exports = {
  registrarAuditoria,
  registrarEventoConReintento,
  registrarLogin,
  capturarEstadoOriginal,
  registrarEvento,
  sanitizeAuditData,
  normalizeTabla,
  tablaVariants,
  toStoredJson,
  cleanIp,
}
