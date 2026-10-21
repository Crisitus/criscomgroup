const fs = require('fs');
const path = require('path');
const { Banner } = require('../models');

const UPLOAD_DIR = path.join(__dirname, '../uploads/banner');
const mediaTypeFor = (file) => file && file.mimetype.startsWith('video/') ? 'video' : 'image';
const storedUrlFor = (file) => `/uploads/banner/${path.basename(file.path)}`;
const removeFile = (filePath) => { try { if (filePath) fs.rmSync(filePath, { force: true }); } catch { /* continuar */ } };
const removeStored = (imagenUrl) => {
  if (!imagenUrl || /^https?:/i.test(imagenUrl)) return;
  removeFile(path.join(UPLOAD_DIR, path.basename(imagenUrl)));
};
const parseBool = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return fallback;
};
const parseOrden = (value) => Math.max(0, Math.min(9999, Math.trunc(Number(value)) || 0));
const validateBannerFile = (file) => {
  if (!file) return 'Debe subir una imagen o video para el banner';
  const max = file.mimetype.startsWith('video/') ? 30 * 1024 * 1024 : 8 * 1024 * 1024;
  return file.size > max ? `El archivo supera el máximo de ${max / 1024 / 1024} MB` : null;
};

const generarUrlCompleta = (imagen_url, req) => {
  if (!imagen_url) return null;
  if (imagen_url.startsWith('http')) return imagen_url;
  const protocol = req.get('X-Forwarded-Proto') || req.protocol || 'https';
  let host = req.get('X-Forwarded-Host') || req.get('Host') || req.get('host');
  if (host && host.includes(',')) host = host.split(',')[0].trim();
  const baseUrl = process.env.PUBLIC_BASE_URL || `${protocol}://${host}`;
  if (imagen_url.startsWith('/uploads/')) return `${baseUrl}${imagen_url}`;
  const filename = imagen_url.split(/[\\\/]/).pop() || imagen_url;
  return `${baseUrl}/uploads/banner/${filename}`;
};
const present = (banner, req) => {
  const data = banner.toJSON();
  if (data.imagen_url) data.imagen_url = generarUrlCompleta(data.imagen_url, req);
  return data;
};
const serverError = (res, message, error) => res.status(500).json({ message, error: error.message });

const bannerController = {
  // GET /banners
  getAll: async (req, res) => {
    try {
      const banners = await Banner.findAll({ order: [['orden', 'ASC'], ['creado_en', 'DESC']] });
      return res.status(200).json(banners.map(b => present(b, req)));
    } catch (error) {
      return serverError(res, 'Error al obtener banners', error);
    }
  },

  // GET /banners/:id
  getById: async (req, res) => {
    try {
      const banner = await Banner.findByPk(req.params.id);
      if (!banner) return res.status(404).json({ message: 'Banner no encontrado' });
      return res.status(200).json(present(banner, req));
    } catch (error) {
      return serverError(res, 'Error al obtener banner', error);
    }
  },

  // POST /banners
  create: async (req, res) => {
    try {
      const fileError = validateBannerFile(req.file);
      if (fileError) {
        removeFile(req.file?.path);
        return res.status(400).json({ message: fileError });
      }
      const { whatsapp, titulo } = req.body;
      const banner = await Banner.create({
        imagen_url: storedUrlFor(req.file),
        media_type: mediaTypeFor(req.file),
        whatsapp: whatsapp || null,
        titulo: String(titulo || '').trim().slice(0, 120) || null,
        activo: parseBool(req.body.activo, true),
        orden: parseOrden(req.body.orden),
      });
      return res.status(201).json({ message: 'Banner creado exitosamente', banner: present(banner, req) });
    } catch (error) {
      removeFile(req.file?.path);
      return serverError(res, 'Error al crear banner', error);
    }
  },

  // PUT /banners/:id
  update: async (req, res) => {
    try {
      const banner = await Banner.findByPk(req.params.id);
      if (!banner) {
        removeFile(req.file?.path);
        return res.status(404).json({ message: 'Banner no encontrado' });
      }
      const previousUrl = banner.imagen_url;
      let replaced = false;
      if (req.file) {
        const fileError = validateBannerFile(req.file);
        if (fileError) {
          removeFile(req.file.path);
          return res.status(400).json({ message: fileError });
        }
        banner.imagen_url = storedUrlFor(req.file);
        banner.media_type = mediaTypeFor(req.file);
        replaced = true;
      }
      if (req.body.whatsapp !== undefined) banner.whatsapp = req.body.whatsapp || null;
      if (req.body.titulo !== undefined) banner.titulo = String(req.body.titulo).trim().slice(0, 120) || null;
      if (req.body.activo !== undefined) banner.activo = parseBool(req.body.activo, banner.activo);
      if (req.body.orden !== undefined) banner.orden = parseOrden(req.body.orden);
      try {
        await banner.save();
      } catch (error) {
        if (replaced) removeFile(req.file.path);
        throw error;
      }
      if (replaced) removeStored(previousUrl);
      return res.status(200).json({ message: 'Banner actualizado exitosamente', banner: present(banner, req) });
    } catch (error) {
      return serverError(res, 'Error al actualizar banner', error);
    }
  },

  // PATCH /banners/:id/activo  (publicar / ocultar)
  setActivo: async (req, res) => {
    try {
      const banner = await Banner.findByPk(req.params.id);
      if (!banner) return res.status(404).json({ message: 'Banner no encontrado' });
      const next = parseBool(req.body?.activo, undefined);
      if (next === undefined) return res.status(400).json({ message: 'El campo activo debe ser verdadero o falso' });
      banner.activo = next;
      await banner.save();
      return res.status(200).json({ message: next ? 'Banner publicado' : 'Banner oculto', banner: present(banner, req) });
    } catch (error) {
      return serverError(res, 'Error al cambiar el estado del banner', error);
    }
  },

  // PATCH /banners/reordenar  body: { orden: [{ id, orden }] }
  reorder: async (req, res) => {
    try {
      const items = req.body?.orden;
      if (!Array.isArray(items) || !items.length || items.length > 200) {
        return res.status(400).json({ message: 'Envía una lista "orden" con entre 1 y 200 banners' });
      }
      const parsed = items.map(i => ({ id: Number(i?.id), orden: Number(i?.orden) }));
      if (parsed.some(i => !Number.isInteger(i.id) || i.id < 1 || !Number.isInteger(i.orden) || i.orden < 0 || i.orden > 9999)) {
        return res.status(400).json({ message: 'Cada elemento necesita un id y un orden numérico válidos' });
      }
      if (new Set(parsed.map(i => i.id)).size !== parsed.length) {
        return res.status(400).json({ message: 'La lista contiene banners repetidos' });
      }
      const found = await Banner.count({ where: { id_banner: parsed.map(i => i.id) } });
      if (found !== parsed.length) return res.status(404).json({ message: 'Algún banner de la lista no existe' });
      await Banner.sequelize.transaction(async (transaction) => {
        for (const item of parsed) {
          await Banner.update({ orden: item.orden }, { where: { id_banner: item.id }, transaction });
        }
      });
      const banners = await Banner.findAll({ order: [['orden', 'ASC'], ['creado_en', 'DESC']] });
      return res.status(200).json({ message: 'Orden actualizado', banners: banners.map(b => present(b, req)) });
    } catch (error) {
      return serverError(res, 'Error al reordenar banners', error);
    }
  },

  // DELETE /banners/:id
  delete: async (req, res) => {
    try {
      const banner = await Banner.findByPk(req.params.id);
      if (!banner) return res.status(404).json({ message: 'Banner no encontrado' });
      const previousUrl = banner.imagen_url;
      await banner.destroy();
      removeStored(previousUrl);
      return res.status(200).json({ message: 'Banner eliminado exitosamente' });
    } catch (error) {
      return serverError(res, 'Error al eliminar banner', error);
    }
  },

  // PATCH /banners/:id/whatsapp
  updateWhatsapp: async (req, res) => {
    try {
      const banner = await Banner.findByPk(req.params.id);
      if (!banner) return res.status(404).json({ message: 'Banner no encontrado' });
      banner.whatsapp = req.body?.whatsapp || null;
      await banner.save();
      return res.status(200).json({ message: 'WhatsApp actualizado', banner: present(banner, req) });
    } catch (error) {
      return serverError(res, 'Error al actualizar WhatsApp', error);
    }
  },
};

module.exports = bannerController;
