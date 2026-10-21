const { sequelize } = require('../config/database');

async function ensureColumns(table, columns) {
  const [existing] = await sequelize.query(`SHOW COLUMNS FROM ${table}`);
  const names = new Set(existing.map(column => column.Field));
  for (const [name, definition] of Object.entries(columns)) {
    if (!names.has(name)) await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

async function ensureContentSchema() {
  await sequelize.query(`CREATE TABLE IF NOT EXISTS community_subscribers (
    id_subscriber INT NOT NULL AUTO_INCREMENT,
    email VARCHAR(180) NOT NULL,
    nombre VARCHAR(150) NULL,
    estado ENUM('activo','baja') NOT NULL DEFAULT 'activo',
    fuente VARCHAR(50) NOT NULL DEFAULT 'footer',
    consentimiento_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    baja_en DATETIME NULL,
    unsubscribe_token CHAR(64) NOT NULL,
    user_id INT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_subscriber),
    UNIQUE KEY uq_community_email (email),
    UNIQUE KEY uq_community_unsubscribe (unsubscribe_token),
    KEY idx_community_estado (estado)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await sequelize.query(`CREATE TABLE IF NOT EXISTS community_campaigns (
    id_campaign INT NOT NULL AUTO_INCREMENT,
    asunto VARCHAR(180) NOT NULL,
    contenido LONGTEXT NOT NULL,
    estado ENUM('borrador','enviando','enviado','parcial','fallido') NOT NULL DEFAULT 'borrador',
    destinatarios INT NOT NULL DEFAULT 0,
    enviados INT NOT NULL DEFAULT 0,
    fallidos INT NOT NULL DEFAULT 0,
    creado_por INT NULL,
    enviado_en DATETIME NULL,
    error TEXT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_campaign),
    KEY idx_campaign_estado_fecha (estado, creado_en)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await ensureColumns('community_subscribers', {
    consentimiento_texto: 'VARCHAR(300) NULL',
    consentimiento_ip: 'VARCHAR(64) NULL',
  });
  await ensureColumns('community_campaigns', {
    modo_envio: 'VARCHAR(10) NULL',
    iniciado_en: 'DATETIME NULL',
  });
  const [stateCol] = await sequelize.query("SHOW COLUMNS FROM community_campaigns LIKE 'estado'");
  if (stateCol[0] && !String(stateCol[0].Type).includes('parcial')) {
    await sequelize.query("ALTER TABLE community_campaigns MODIFY COLUMN estado ENUM('borrador','enviando','enviado','parcial','fallido') NOT NULL DEFAULT 'borrador'");
  }

  await sequelize.query(`CREATE TABLE IF NOT EXISTS community_deliveries (
    id_delivery INT NOT NULL AUTO_INCREMENT,
    campaign_id INT NOT NULL,
    subscriber_id INT NOT NULL,
    estado ENUM('enviado','fallido') NOT NULL,
    error VARCHAR(500) NULL,
    enviado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_delivery),
    UNIQUE KEY uq_community_delivery (campaign_id, subscriber_id),
    KEY idx_community_delivery_estado (campaign_id, estado)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await sequelize.query(`CREATE TABLE IF NOT EXISTS blog_posts (
    id_post INT NOT NULL AUTO_INCREMENT,
    titulo VARCHAR(180) NOT NULL,
    slug VARCHAR(190) NOT NULL,
    resumen VARCHAR(320) NOT NULL,
    contenido LONGTEXT NOT NULL,
    imagen_url VARCHAR(500) NULL,
    categoria VARCHAR(80) NOT NULL DEFAULT 'Tecnología',
    palabras_clave TEXT NULL,
    estado ENUM('borrador','publicado') NOT NULL DEFAULT 'borrador',
    autor_id INT NULL,
    publicado_en DATETIME NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_post),
    UNIQUE KEY uq_blog_posts_slug (slug),
    KEY idx_blog_posts_estado_fecha (estado, publicado_en)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await sequelize.query(`CREATE TABLE IF NOT EXISTS solicitudes_postventa (
    id_solicitud INT NOT NULL AUTO_INCREMENT,
    codigo_seguimiento VARCHAR(32) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(180) NOT NULL,
    telefono VARCHAR(30) NULL,
    numero_pedido VARCHAR(80) NOT NULL,
    tipo ENUM('cambio','devolucion','garantia') NOT NULL,
    producto_servicio VARCHAR(220) NOT NULL,
    motivo VARCHAR(180) NOT NULL,
    detalle TEXT NOT NULL,
    solucion_solicitada TEXT NOT NULL,
    estado ENUM('recibida','en_revision','esperando_cliente','aprobada','rechazada','resuelta') NOT NULL DEFAULT 'recibida',
    notas_admin TEXT NULL,
    respuesta_cliente TEXT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_solicitud),
    UNIQUE KEY uq_postventa_codigo (codigo_seguimiento),
    KEY idx_postventa_estado_fecha (estado, fecha_creacion)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await ensureColumns('solicitudes_postventa', {
    pedido_id: 'INT NULL',
    venta_id: 'INT NULL',
    cantidad: 'INT NOT NULL DEFAULT 1',
    vinculado: 'TINYINT(1) NOT NULL DEFAULT 0',
    fuera_de_plazo: 'TINYINT(1) NULL',
    accion_posterior: "VARCHAR(30) NULL",
    accion_posterior_nota: 'TEXT NULL',
  });
  await sequelize.query(`CREATE TABLE IF NOT EXISTS postventa_historial (
    id_historial INT NOT NULL AUTO_INCREMENT,
    solicitud_id INT NOT NULL,
    usuario_id INT NULL,
    de VARCHAR(30) NULL,
    a VARCHAR(30) NOT NULL,
    nota TEXT NULL,
    creado DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_historial),
    KEY idx_postventa_hist_solicitud (solicitud_id, creado)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

module.exports = { ensureContentSchema };
