const { Op } = require('sequelize');
const { BlogPost } = require('../models');

const LIST_EXCLUDE = ['autor_id', 'contenido'];
const DEFAULT_CATEGORY = 'Tecnolog\u00eda';
const LIMITS = { titulo: 180, slug: 180, resumen: 320, categoria: 80, imagen_url: 500 };

const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const cleanSlug = value => fold(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const own = (body, key) => Object.prototype.hasOwnProperty.call(body, key);

// Fechas como ISO con offset de Lima (-05:00); el ecommerce las trata como string.
// En MySQL la conexion usa dateStrings + typeCast: el valor leido es la hora de pared de Lima
// que Sequelize interpreta como UTC, asi que su ISO sin 'Z' ya es la hora de Lima.
const lima = require('../config/database').sequelize.getDialect() !== 'sqlite';
const iso = value => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const shifted = lima ? date : new Date(date.getTime() - 5 * 3600 * 1000);
  return shifted.toISOString().replace('Z', '-05:00');
};
const wire = post => {
  const row = typeof post.toJSON === 'function' ? post.toJSON() : { ...post };
  for (const key of ['publicado_en', 'actualizado_en', 'creado_en']) if (key in row) row[key] = iso(row[key]);
  return row;
};
const fail = (res, status, message, errores) => res.status(status).json(errores ? { message, errores } : { message });
const safe = (fn, label) => async (req, res) => {
  try { await fn(req, res); } catch (error) {
    console.error(`[blog] ${label}:`, error);
    if (!res.headersSent) fail(res, 500, 'Error interno al procesar la publicaci\u00f3n.');
  }
};

// Evita duplicados "Tecnologia" vs "Tecnolog\u00eda": reutiliza la grafia ya existente.
const normalizeCategory = async raw => {
  const text = String(raw || '').replace(/\s+/g, ' ').trim() || DEFAULT_CATEGORY;
  const key = fold(text);
  const rows = await BlogPost.findAll({ attributes: ['categoria'], group: ['categoria'], raw: true });
  const match = rows.find(row => fold(row.categoria) === key);
  if (match) return match.categoria;
  return text.charAt(0).toUpperCase() + text.slice(1);
};
const parseDate = value => {
  if (value === undefined) return { skip: true };
  if (value === null || value === '') return { value: null };
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? { error: true } : { value: date };
};

const readFields = (body, current) => {
  const get = (key, fallback = '') => (own(body, key) ? String(body[key] ?? '').trim() : fallback);
  const titulo = get('titulo', current?.titulo);
  const rawSlug = own(body, 'slug') && String(body.slug || '').trim() ? body.slug : (current ? current.slug : titulo);
  return {
    titulo,
    slug: cleanSlug(rawSlug),
    resumen: get('resumen', current?.resumen),
    contenido: get('contenido', current?.contenido),
    imagen_url: get('imagen_url', current?.imagen_url || ''),
    categoria: get('categoria', current?.categoria),
    palabras_clave: get('palabras_clave', current?.palabras_clave || ''),
    estado: own(body, 'estado') ? body.estado : (current?.estado || 'borrador'),
  };
};
const validate = (d, fecha) => {
  const e = {};
  if (d.titulo.length < 5) e.titulo = 'El t\u00edtulo debe tener al menos 5 caracteres.';
  else if (d.titulo.length > LIMITS.titulo) e.titulo = `El t\u00edtulo no puede superar ${LIMITS.titulo} caracteres.`;
  if (!d.slug) e.slug = 'No se pudo generar una URL v\u00e1lida; escribe una usando letras o n\u00fameros.';
  else if (d.slug.length < 3) e.slug = 'La URL debe tener al menos 3 caracteres.';
  else if (d.slug.length > LIMITS.slug) e.slug = `La URL no puede superar ${LIMITS.slug} caracteres.`;
  if (d.resumen.length < 20) e.resumen = 'El resumen debe tener al menos 20 caracteres.';
  else if (d.resumen.length > LIMITS.resumen) e.resumen = `El resumen no puede superar ${LIMITS.resumen} caracteres (tiene ${d.resumen.length}).`;
  if (d.contenido.length < 80) e.contenido = 'El contenido debe tener al menos 80 caracteres.';
  if (d.imagen_url && (d.imagen_url.length > LIMITS.imagen_url || !/^(https:\/\/\S+|\/uploads\/\S+)$/i.test(d.imagen_url))) e.imagen_url = 'La imagen debe ser una URL https o una ruta /uploads/...';
  if (d.categoria.length > LIMITS.categoria) e.categoria = `La categor\u00eda no puede superar ${LIMITS.categoria} caracteres.`;
  if (!['borrador', 'publicado'].includes(d.estado)) e.estado = 'El estado debe ser borrador o publicado.';
  if (fecha.error) e.publicado_en = 'La fecha de publicaci\u00f3n no es v\u00e1lida (usa formato ISO).';
  return e;
};
const freeSlug = async (slug, ignoreId) => {
  let candidate = slug; let n = 1;
  for (;;) {
    const where = { slug: candidate }; if (ignoreId) where.id_post = { [Op.ne]: ignoreId };
    if (!(await BlogPost.count({ where }))) return candidate;
    n += 1; candidate = `${slug.slice(0, LIMITS.slug - String(n).length - 1)}-${n}`;
  }
};

const liveWhere = () => ({ estado: 'publicado', publicado_en: { [Op.lte]: new Date() } });

exports.publicList = safe(async (_req, res) => {
  const posts = await BlogPost.findAll({ where: liveWhere(), order: [['publicado_en', 'DESC']], attributes: { exclude: LIST_EXCLUDE } });
  res.json(posts.map(wire));
}, 'publicList');

exports.publicOne = safe(async (req, res) => {
  const post = await BlogPost.findOne({ where: { slug: req.params.slug, ...liveWhere() }, attributes: { exclude: ['autor_id'] } });
  if (!post) return fail(res, 404, 'Publicación no encontrada');
  res.json(wire(post));
}, 'publicOne');

exports.adminList = safe(async (req, res) => {
  const { q, estado, categoria } = req.query;
  const where = {};
  if (estado) {
    if (!['borrador', 'publicado'].includes(estado)) return fail(res, 400, 'Estado inválido', { estado: 'Usa borrador o publicado.' });
    where.estado = estado;
  }
  if (categoria) {
    const key = fold(categoria);
    const rows = await BlogPost.findAll({ attributes: ['categoria'], group: ['categoria'], raw: true });
    where.categoria = { [Op.in]: rows.map(r => r.categoria).filter(c => fold(c) === key).concat('__none__') };
  }
  if (q && String(q).trim()) {
    const like = `%${String(q).trim().replace(/[%_\\]/g, m => `\\${m}`)}%`;
    where[Op.or] = [{ titulo: { [Op.like]: like } }, { slug: { [Op.like]: like } }, { resumen: { [Op.like]: like } }];
  }
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 0, 0), 200);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const options = { where, order: [['actualizado_en', 'DESC'], ['id_post', 'DESC']], attributes: { exclude: LIST_EXCLUDE } };
  if (limit) { options.limit = limit; options.offset = offset; }
  const [posts, total] = await Promise.all([BlogPost.findAll(options), BlogPost.count({ where })]);
  res.set('Access-Control-Expose-Headers', 'X-Total-Count').set('X-Total-Count', String(total));
  res.json(posts.map(wire));
}, 'adminList');

exports.adminOne = safe(async (req, res) => {
  const post = await BlogPost.findByPk(req.params.id);
  if (!post) return fail(res, 404, 'Publicación no encontrada');
  res.json(wire(post));
}, 'adminOne');

exports.categories = safe(async (_req, res) => {
  const rows = await BlogPost.findAll({ attributes: ['categoria'], group: ['categoria'], raw: true });
  const seen = new Map();
  for (const row of rows) if (!seen.has(fold(row.categoria))) seen.set(fold(row.categoria), row.categoria);
  res.json([...seen.values()].sort((a, b) => a.localeCompare(b, 'es')));
}, 'categories');

exports.create = safe(async (req, res) => {
  const body = req.body || {};
  const data = readFields(body, null);
  const fecha = parseDate(body.publicado_en);
  const errores = validate(data, fecha);
  if (Object.keys(errores).length) return fail(res, 400, 'Revisa los campos marcados antes de guardar.', errores);
  data.categoria = await normalizeCategory(data.categoria);
  data.imagen_url = data.imagen_url || null;
  data.palabras_clave = data.palabras_clave || null;
  const wanted = data.slug;
  data.slug = await freeSlug(wanted);
  data.autor_id = req.user?.id_user || req.user?.id || null;
  if (fecha.value) data.publicado_en = fecha.value;
  else if (data.estado === 'publicado') data.publicado_en = new Date();
  try {
    const post = await BlogPost.create(data);
    await post.reload();
    const out = wire(post);
    if (data.slug !== wanted) out.aviso_slug = `La URL /${wanted} ya existía; se usó /${data.slug}.`;
    return res.status(201).json(out);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return fail(res, 409, 'Ese slug ya existe.', { slug: 'Ya existe una publicación con esa URL.' });
    throw error;
  }
}, 'create');

exports.update = safe(async (req, res) => {
  const post = await BlogPost.findByPk(req.params.id);
  if (!post) return fail(res, 404, 'Publicación no encontrada');
  const body = req.body || {};
  const data = readFields(body, post);
  const fecha = parseDate(body.publicado_en);
  const errores = validate(data, fecha);
  if (Object.keys(errores).length) return fail(res, 400, 'Revisa los campos marcados antes de guardar.', errores);
  data.categoria = await normalizeCategory(data.categoria);
  data.imagen_url = data.imagen_url || null;
  data.palabras_clave = data.palabras_clave || null;
  let aviso;
  if (data.slug !== post.slug) {
    if (post.estado === 'publicado' && body.cambiar_slug !== true) {
      aviso = `La publicación está publicada: la URL /${post.slug} se mantiene. Envía cambiar_slug=true para cambiarla (los enlaces antiguos dejarán de funcionar).`;
      data.slug = post.slug;
    } else {
      const wanted = data.slug;
      data.slug = await freeSlug(wanted, post.id_post);
      if (data.slug !== wanted) aviso = `La URL /${wanted} ya existía; se usó /${data.slug}.`;
      else if (post.estado === 'publicado') aviso = `La URL cambió de /${post.slug} a /${data.slug}; los enlaces antiguos ya no responden.`;
    }
  }
  if (!fecha.skip) data.publicado_en = fecha.value;
  if (data.estado === 'publicado' && !(fecha.value || (fecha.skip && post.publicado_en))) data.publicado_en = new Date();
  try { await post.update(data); } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return fail(res, 409, 'Ese slug ya existe.', { slug: 'Ya existe una publicación con esa URL.' });
    throw error;
  }
  await post.reload();
  const out = wire(post);
  if (aviso) out.aviso_slug = aviso;
  res.json(out);
}, 'update');

exports.remove = safe(async (req, res) => {
  const post = await BlogPost.findByPk(req.params.id);
  if (!post) return fail(res, 404, 'Publicación no encontrada');
  await post.destroy();
  res.json({ message: 'Publicación eliminada' });
}, 'remove');
