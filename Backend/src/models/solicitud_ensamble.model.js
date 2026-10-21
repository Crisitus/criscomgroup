const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

/**
 * Modelo de Solicitud de Armado / Ensamble de PC.
 *
 * Flujo público (sin auth): el cliente arma su solicitud desde el ecommerce
 * (/armar-pc) y recibe un `codigo_seguimiento` único para consultar el estado
 * en /seguimiento-solicitud/:codigo. El admin del ERP (cuenta maestra) la
 * cotiza y gestiona desde endpoints autenticados.
 *
 * Tres modos de entrada:
 *   - modo = "marketplace": el cliente ya sabe qué quiere y eligió productos
 *     del catálogo. `productos` guarda el detalle elegido.
 *   - modo = "presupuesto": el cliente no sabe; eligió un tier de presupuesto
 *     y respondió preferencias para que el ERP arme la cotización.
 *   - modo = "ensamble_propio": el cliente ya tiene las piezas y solo necesita
 *     el servicio de ensamblaje (mano de obra).
 */
const SolicitudEnsamble = sequelize.define(
  "SolicitudEnsamble",
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
    // Contacto del solicitante (form público sin auth)
    nombre_solicitante: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: { notEmpty: true },
    },
    telefono_solicitante: {
      type: DataTypes.STRING(40),
      allowNull: false,
      validate: { notEmpty: true },
    },
    email_solicitante: {
      type: DataTypes.STRING(160),
      allowNull: true,
      validate: { isEmailOrEmpty(value) { if (value && !/^\S+@\S+\.\S+$/.test(value)) throw new Error("Email inválido"); } },
    },
    ciudad: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: { notEmpty: true },
    },
    // Futura integración con auth de clientes (nullable por ahora)
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // Modo de la solicitud
    modo: {
      type: DataTypes.ENUM("marketplace", "presupuesto", "ensamble_propio"),
      allowNull: false,
    },
    // --- Modo marketplace: productos elegidos del catálogo ---
    // Array de { id_producto, nombre, precio, cantidad }
    productos: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Modo marketplace: productos elegidos por el cliente.",
    },
    // --- Modo presupuesto ---
    tier_presupuesto: {
      type: DataTypes.ENUM(
        "oficina",
        "gamer",
        "alto_rendimiento",
        "workstation",
        "otro"
      ),
      allowNull: true,
      comment: "Tier de presupuesto (semántico, no monetary value)",
    },
    presupuesto_personalizado: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "Presupuesto personalizado en soles cuando tier_presupuesto = 'otro'",
    },
    uso_descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Juegos/trabajos que hará el equipo (modo presupuesto).",
    },
    incluye_perifericos: {
      type: DataTypes.ENUM("solo_pc", "con_perifericos"),
      allowNull: true,
      defaultValue: "solo_pc",
    },
    marcas_preferencia: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Marcas o preferencias de armado en texto libre.",
    },
    // Prioridades de armado (máx 2). Array de strings:
    // grafica | procesador | placa | estetica | refrigeracion | almacenamiento | silencio | portabilidad
    prioridades: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Máximo 2 prioridades marcadas por el cliente.",
    },
    mensaje: { type: DataTypes.TEXT, allowNull: true },
    // Estado del flujo de trabajo (misma familia que importación)
    estado: {
      type: DataTypes.ENUM(
        "recibida",
        "en_revision",
        "cotizada",
        "aprobada",
        "en_ensamble",
        "entregada",
        "rechazada"
      ),
      allowNull: false,
      defaultValue: "recibida",
    },
    // Cotización (visible al cliente en seguimiento)
    cotizacion_monto: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    cotizacion_nota: { type: DataTypes.TEXT, allowNull: true },
    cotizacion_fecha: { type: DataTypes.DATE, allowNull: true },
    // Vigencia de la cotización (7 días por defecto, ajustable al cotizar).
    valida_hasta: { type: DataTypes.DATE, allowNull: true },
    // Fecha civil (YYYY-MM-DD), sin zona horaria.
    fecha_entrega_estimada: { type: DataTypes.DATEONLY, allowNull: true },
    // Conversión a cotización profesional (idempotente).
    cotizacion_id: { type: DataTypes.INTEGER, allowNull: true },
    convertida_en: { type: DataTypes.DATE, allowNull: true },
    notas_admin: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Solo visible para admins. NO se expone en seguimiento público.",
    },
  },
  {
    tableName: "solicitudes_ensamble",
    underscored: true,
    timestamps: true,
  }
);

module.exports = SolicitudEnsamble;