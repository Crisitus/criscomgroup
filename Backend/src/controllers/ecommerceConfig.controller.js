'use strict';
// GET /api/ecommerce/config-publica — datos públicos de la empresa para el ecommerce.
// Solo campos seguros: JAMAS ruc, sol_user/sol_pass, cert_path, client_id/secret ni series SUNAT.
const Company = require('../models/company.model');

// Mismos defaults de ERP que social_links.controller: ambos endpoints públicos
// deben decir lo mismo. El front nunca hardcodea; si un valor llega vacio, lo oculta.
const DEFAULT_REDES = Object.freeze({
  instagram_url: 'https://www.instagram.com/criscomgroup/',
  facebook_url: 'https://www.facebook.com/profile.php?id=61572916207328',
  tiktok_url: 'https://www.tiktok.com/@criscomgroup',
  youtube_url: '',
  whatsapp_number: '51904589554',
});

const findPrimaryCompany = () => Company.findOne({
  order: [['emisor_predeterminado', 'DESC'], ['id_company', 'ASC']],
});

exports.getConfigPublica = async (_req, res) => {
  try {
    const company = await findPrimaryCompany();
    const whatsapp = company?.whatsapp_number || DEFAULT_REDES.whatsapp_number;
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=900');
    return res.json({
      nombre_comercial: company?.razon_social || null,
      direccion: company?.direccion || null,
      horario: {
        inicio: company?.horario_inicio || null,
        fin: company?.horario_fin || null,
      },
      telefono: whatsapp || null,
      whatsapp_number: whatsapp || null,
      redes: {
        instagram_url: company?.instagram_url ?? DEFAULT_REDES.instagram_url,
        facebook_url: company?.facebook_url ?? DEFAULT_REDES.facebook_url,
        tiktok_url: company?.tiktok_url ?? DEFAULT_REDES.tiktok_url,
        youtube_url: company?.youtube_url ?? DEFAULT_REDES.youtube_url,
      },
    });
  } catch (error) {
    console.error('Error al obtener config pública de empresa:', error);
    return res.status(500).json({ message: 'No se pudo obtener la configuración pública' });
  }
};
