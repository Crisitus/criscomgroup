const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * Modelo de Solicitud de Importación.
 *
 * MVP público (hot-patch B): el cliente crea la solicitud sin auth y recibe
 * un `codigo_seguimiento` único para consultar su estado en /seguimiento/:codigo.
 * El admin del ERP (rol Gerente/Administrador) gestiona estado y cotización
 * desde endpoints autenticados.
 */
const SolicitudImportacion = sequelize.define(
  "SolicitudImportacion",
  {
    id_solicitud: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    codigo_seguimiento: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
    },
    // Identificación del solicitante (form público sin auth)
    nombre_solicitante: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: { notEmpty: true },
    },
    email_solicitante: {
      type: DataTypes.STRING(160),
      allowNull: false,
      validate: { isEmail: true },
    },
    telefono_solicitante: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    // Futura integración con auth de clientes (nullable por ahora)
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // Detalles del producto solicitado
    nombre_producto: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: { notEmpty: true },
    },
    tipo_producto: {
      type: DataTypes.ENUM(
        "laptop",
        "componente",
        "periferico",
        "monitor",
        "almacenamiento",
        "red",
        "otro"
      ),
      allowNull: false,
    },
    marca: { type: DataTypes.STRING(80), allowNull: true },
    modelo: { type: DataTypes.STRING(120), allowNull: true },
    especificaciones: { type: DataTypes.TEXT, allowNull: true },
    pais_origen: { type: DataTypes.STRING(80), allowNull: true },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: { min: 1 },
    },
    presupuesto_min: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: { min: 0 },
    },
    presupuesto_max: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: { min: 0 },
    },
    nivel_urgencia: {
      type: DataTypes.ENUM("baja", "media", "alta", "urgente"),
      allowNull: false,
      defaultValue: "media",
    },
    mensaje: { type: DataTypes.TEXT, allowNull: true },
    imagenes_urls: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Array de URLs de imágenes adjuntas. MVP no soporta upload.",
    },
    // Estado del flujo de trabajo
    estado: {
      type: DataTypes.ENUM(
        "recibida",
        "en_revision",
        "cotizada",
        "aprobada",
        "en_transito",
        "entregada",
        "rechazada"
      ),
      allowNull: false,
      defaultValue: "recibida",
    },
    // Información manejada por el admin (cliente no la ve en seguimiento público
    // salvo campos explícitos de cotización)
    cotizacion_monto: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    cotizacion_nota: { type: DataTypes.TEXT, allowNull: true },
    cotizacion_fecha: { type: DataTypes.DATE, allowNull: true },
    // Vigencia de la cotización (7 días por defecto, ajustable al cotizar).
    valida_hasta: { type: DataTypes.DATE, allowNull: true },
    // Fecha civil (YYYY-MM-DD), sin zona horaria.
    fecha_entrega_estimada: { type: DataTypes.DATEONLY, allowNull: true },
    // Conversión a Importación (idempotente): una solicitud genera a lo sumo una.
    importacion_id: { type: DataTypes.INTEGER, allowNull: true },
    convertida_en: { type: DataTypes.DATE, allowNull: true },
    notas_admin: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Solo visible para admins. NO se expone en seguimiento público.",
    },
  },
  {
    tableName: "solicitudes_importacion",
    underscored: true,
    timestamps: true,
  }
);

module.exports = SolicitudImportacion;
