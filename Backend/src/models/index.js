const { sequelize } = require("../config/database");
const Categoria = require("./categoria.model");
const Producto = require("./producto.model");
const User = require("./user.model");
const Company = require("./company.model");
const Venta = require("./venta.model");
const SerieComprobante = require("./serie_comprobante.model");
const DetalleVenta = require("./detalle_venta.model");
const CodigoBarras = require("./codigo_barras.model");
const Role = require("./role.models");
const CierreCaja = require("./cierre_caja.model");
const AuditLog = require("./audit_log.model");
const Oferta = require("./oferta.model")(
  sequelize,
  require("sequelize").DataTypes,
);
const Banner = require("./banner.model");
const Tarjeta = require("./tarjeta.model");
const Pedido = require("./pedido.model");
const PedidoDetalle = require("./pedido_detalle.model");
const Pago = require("./pago.model");
const DocumentoElectronico = require("./documento_electronico.model");
const AdquisicionUsado = require("./adquisicion_usado.model");
const GastoTaller = require("./gasto_taller.model");
const Importacion = require("./importacion.model");
const OrdenServicio = require("./orden_servicio.model");
const OrdenServicioEvento = require("./orden_servicio_evento.model");
const OrdenServicioPago = require("./orden_servicio_pago.model");
const OrdenServicioRepuesto = require("./orden_servicio_repuesto.model");
const OrdenServicioEvidencia = require("./orden_servicio_evidencia.model");
const OrdenServicioCotizacion = require("./orden_servicio_cotizacion.model");
const OrdenServicioDiagnostico = require("./orden_servicio_diagnostico.model");
const OrdenServicioMensaje = require('./orden_servicio_mensaje.model');
const OrdenServicioCanalEvento = require('./orden_servicio_canal_evento.model');
const ClienteServicio = require('./cliente_servicio.model');
const ActivoTecnico = require('./activo_tecnico.model');
const OrdenServicioCredencial = require('./orden_servicio_credencial.model');
const SolicitudServicio = require("./solicitud_servicio.model");
const AdquirentePos = require("./adquirente_pos.model");
const PagoPos = require("./pago_pos.model");
const AffiliateBusiness = require('./affiliate_business.model');
const AffiliateSettlement = require('./affiliate_settlement.model');
const AffiliatePayment = require('./affiliate_payment.model');
const CarritoItem = require('./carrito_item.model');
const PedidoVenta = require('./pedido_venta.model');
const Proveedor = require('./proveedor.model');
const Compra = require('./compra.model');
const CompraDetalle = require('./compra_detalle.model');
const MovimientoInventario = require('./movimiento_inventario.model');
const InventarioUbicacion = require('./inventario_ubicacion.model');
const InventarioQuant = require('./inventario_quant.model');
const InventarioReserva = require('./inventario_reserva.model');
const Cotizacion = require('./cotizacion.model');
const CotizacionDetalle = require('./cotizacion_detalle.model');
const AreaGrant = require('./area_grant.model');
const AccessRequest = require('./access_request.model');
const PaymentGateway = require('./payment_gateway.model');
const BlogPost = require('./blog_post.model');
const SolicitudPostventa = require('./solicitud_postventa.model');
const SolicitudPostventaHistorial = require('./solicitud_postventa_historial.model');

Categoria.hasMany(Producto, {
  foreignKey: "id_categoria",
  as: "productos",
});

Producto.belongsTo(Categoria, {
  foreignKey: "id_categoria",
  as: "categoria",
});

Producto.hasMany(CodigoBarras, {
  foreignKey: "id_producto",
  as: "codigos_barras",
});

CodigoBarras.belongsTo(Producto, {
  foreignKey: "id_producto",
  as: "producto",
});

User.hasMany(Company, {
  foreignKey: "id_user",
  as: "companies",
});

Company.belongsTo(User, {
  foreignKey: "id_user",
  as: "users",
});
User.belongsTo(AffiliateBusiness, { foreignKey: 'affiliate_business_id', as: 'affiliate_business' });
AffiliateBusiness.belongsTo(User, { foreignKey: 'owner_user_id', as: 'owner' });
AffiliateBusiness.hasMany(AffiliateSettlement, { foreignKey: 'affiliate_business_id', as: 'settlements' });
AffiliateSettlement.belongsTo(AffiliateBusiness, { foreignKey: 'affiliate_business_id', as: 'business' });
AffiliateSettlement.hasMany(AffiliatePayment, { foreignKey: 'settlement_id', as: 'payments' });
AffiliatePayment.belongsTo(AffiliateSettlement, { foreignKey: 'settlement_id', as: 'settlement' });
User.hasMany(CarritoItem, { foreignKey: 'id_usuario', as: 'carrito_items' });
CarritoItem.belongsTo(User, { foreignKey: 'id_usuario', as: 'usuario' });
Producto.hasMany(CarritoItem, { foreignKey: 'id_producto', as: 'carritos' });
CarritoItem.belongsTo(Producto, { foreignKey: 'id_producto', as: 'producto' });
Pedido.hasMany(PedidoVenta, { foreignKey: 'id_pedido', as: 'ventas_generadas' });
PedidoVenta.belongsTo(Pedido, { foreignKey: 'id_pedido', as: 'pedido' });
Venta.hasMany(PedidoVenta, { foreignKey: 'venta_id', as: 'pedidos_origen' });
PedidoVenta.belongsTo(Venta, { foreignKey: 'venta_id', as: 'venta' });

Venta.hasMany(DetalleVenta, {
  foreignKey: "venta_id",
  as: "detalles",
});

DetalleVenta.belongsTo(Venta, {
  foreignKey: "venta_id",
  as: "venta",
});

Producto.hasMany(DetalleVenta, {
  foreignKey: "producto_id",
  as: "ventas",
});

DetalleVenta.belongsTo(Producto, {
  foreignKey: "producto_id",
  as: "producto",
});

Pedido.hasMany(PedidoDetalle, { foreignKey: "id_pedido", as: "detalles" });
PedidoDetalle.belongsTo(Pedido, { foreignKey: "id_pedido", as: "pedido" });
PedidoDetalle.belongsTo(Producto, {
  foreignKey: "producto_id",
  as: "producto",
});
Pedido.hasMany(Pago, { foreignKey: "id_pedido", as: "pagos" });
Pago.belongsTo(Pedido, { foreignKey: "id_pedido", as: "pedido" });
Pedido.hasMany(DocumentoElectronico, {
  foreignKey: "id_pedido",
  as: "comprobantes",
});
Venta.hasMany(DocumentoElectronico, {
  foreignKey: "venta_id",
  as: "documentos_electronicos",
});
Company.hasMany(DocumentoElectronico, {
  foreignKey: "id_company_emisor",
  as: "documentos_electronicos",
});
DocumentoElectronico.belongsTo(Company, {
  foreignKey: "id_company_emisor",
  as: "emisor",
});
Company.hasMany(Venta, {
  foreignKey: "id_company_emisor",
  as: "ventas_emitidas",
});
Venta.belongsTo(Company, {
  foreignKey: "id_company_emisor",
  as: "emisor_fiscal",
});
OrdenServicio.belongsTo(Venta, { foreignKey: 'venta_id', as: 'venta_contable' });
Venta.belongsTo(OrdenServicio, { foreignKey: 'orden_servicio_id', as: 'orden_servicio' });
Producto.hasMany(AdquisicionUsado, {
  foreignKey: "producto_id",
  as: "adquisiciones",
});
AdquisicionUsado.belongsTo(Producto, {
  foreignKey: "producto_id",
  as: "producto",
});
Producto.hasMany(Importacion, { foreignKey: "producto_id", as: "importaciones" });
Importacion.belongsTo(Producto, { foreignKey: "producto_id", as: "producto" });
OrdenServicio.hasMany(GastoTaller, {
  foreignKey: "orden_servicio_id",
  as: "gastos_taller",
});
GastoTaller.belongsTo(OrdenServicio, {
  foreignKey: "orden_servicio_id",
  as: "orden",
});
AdquirentePos.hasMany(PagoPos, { foreignKey: "id_adquirente", as: "pagos" });
PagoPos.belongsTo(AdquirentePos, {
  foreignKey: "id_adquirente",
  as: "adquirente",
});
Venta.hasOne(PagoPos, { foreignKey: "venta_id", as: "pago_pos" });
PagoPos.belongsTo(Venta, { foreignKey: "venta_id", as: "venta" });
OrdenServicio.hasMany(OrdenServicioEvento, {
  foreignKey: "id_orden_servicio",
  as: "eventos",
});
OrdenServicioEvento.belongsTo(OrdenServicio, {
  foreignKey: "id_orden_servicio",
  as: "orden",
});
OrdenServicio.hasMany(OrdenServicioPago, {
  foreignKey: "id_orden_servicio",
  as: "pagos",
});
OrdenServicioPago.belongsTo(OrdenServicio, {
  foreignKey: "id_orden_servicio",
  as: "orden",
});
OrdenServicio.hasMany(OrdenServicioRepuesto, {
  foreignKey: "id_orden_servicio",
  as: "repuestos",
});
OrdenServicioRepuesto.belongsTo(OrdenServicio, {
  foreignKey: "id_orden_servicio",
  as: "orden",
});
OrdenServicioRepuesto.belongsTo(Producto, {
  foreignKey: "id_producto",
  as: "producto",
});
OrdenServicio.hasMany(OrdenServicioEvidencia, {
  foreignKey: "id_orden_servicio",
  as: "evidencias",
});
OrdenServicioEvidencia.belongsTo(OrdenServicio, {
  foreignKey: "id_orden_servicio",
  as: "orden",
});
OrdenServicio.hasMany(OrdenServicioCotizacion, {
  foreignKey: "id_orden_servicio",
  as: "cotizaciones",
});
OrdenServicioCotizacion.belongsTo(OrdenServicio, {
  foreignKey: "id_orden_servicio",
  as: "orden",
});
OrdenServicio.hasMany(OrdenServicioDiagnostico, { foreignKey: 'id_orden_servicio', as: 'diagnosticos_asistidos' });
OrdenServicioDiagnostico.belongsTo(OrdenServicio, { foreignKey: 'id_orden_servicio', as: 'orden' });
OrdenServicio.hasMany(OrdenServicioMensaje, { foreignKey: 'id_orden_servicio', as: 'mensajes' });
OrdenServicioMensaje.belongsTo(OrdenServicio, { foreignKey: 'id_orden_servicio', as: 'orden' });
OrdenServicio.hasMany(OrdenServicioCanalEvento, { foreignKey: 'id_orden_servicio', as: 'canal_eventos' });
OrdenServicioCanalEvento.belongsTo(OrdenServicio, { foreignKey: 'id_orden_servicio', as: 'orden' });
OrdenServicioCanalEvento.belongsTo(OrdenServicioEvidencia, { foreignKey: 'id_evidencia_servicio', as: 'evidencia' });
ClienteServicio.hasMany(ActivoTecnico, { foreignKey: 'id_cliente_servicio', as: 'activos' });
ActivoTecnico.belongsTo(ClienteServicio, { foreignKey: 'id_cliente_servicio', as: 'cliente' });
ClienteServicio.hasMany(OrdenServicio, { foreignKey: 'cliente_servicio_id', as: 'ordenes' });
OrdenServicio.belongsTo(ClienteServicio, { foreignKey: 'cliente_servicio_id', as: 'cliente_registrado' });
ActivoTecnico.hasMany(OrdenServicio, { foreignKey: 'activo_tecnico_id', as: 'ordenes' });
OrdenServicio.belongsTo(ActivoTecnico, { foreignKey: 'activo_tecnico_id', as: 'activo' });
OrdenServicio.hasOne(OrdenServicioCredencial, { foreignKey: 'id_orden_servicio', as: 'credencial_temporal' });
OrdenServicioCredencial.belongsTo(OrdenServicio, { foreignKey: 'id_orden_servicio', as: 'orden' });

// Relación entre User y Role
// Un usuario pertenece a un rol
// Un rol puede tener muchos usuarios
User.belongsTo(Role, {
  foreignKey: "id_role",
  as: "roles",
});
Role.hasMany(User, {
  foreignKey: "id_role",
  as: "users",
});

// Agregar la relación entre AuditLog y User
User.hasMany(AuditLog, {
  foreignKey: "usuario_id",
  as: "logs",
});

AuditLog.belongsTo(User, {
  foreignKey: "usuario_id",
  as: "usuario",
});

Producto.hasOne(Oferta, {
  foreignKey: "id_producto",
  as: "oferta",
});

Proveedor.hasMany(Compra, { foreignKey: 'proveedor_id', as: 'compras' });
Compra.belongsTo(Proveedor, { foreignKey: 'proveedor_id', as: 'proveedor' });
Compra.hasMany(CompraDetalle, { foreignKey: 'compra_id', as: 'detalles' });
CompraDetalle.belongsTo(Compra, { foreignKey: 'compra_id', as: 'compra' });
CompraDetalle.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
Producto.hasMany(MovimientoInventario, { foreignKey: 'producto_id', as: 'movimientos' });
MovimientoInventario.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
Producto.hasMany(InventarioQuant, { foreignKey: 'producto_id', as: 'quants' });
InventarioQuant.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
InventarioUbicacion.hasMany(InventarioQuant, { foreignKey: 'ubicacion_id', as: 'quants' });
InventarioQuant.belongsTo(InventarioUbicacion, { foreignKey: 'ubicacion_id', as: 'ubicacion' });
InventarioQuant.hasMany(InventarioReserva, { foreignKey: 'quant_id', as: 'reservas' });
InventarioReserva.belongsTo(InventarioQuant, { foreignKey: 'quant_id', as: 'quant' });
OrdenServicioRepuesto.hasMany(InventarioReserva, { foreignKey: 'repuesto_servicio_id', as: 'reservas_inventario' });
InventarioReserva.belongsTo(OrdenServicioRepuesto, { foreignKey: 'repuesto_servicio_id', as: 'repuesto' });
Cotizacion.hasMany(CotizacionDetalle, { foreignKey: 'cotizacion_id', as: 'detalles' });
CotizacionDetalle.belongsTo(Cotizacion, { foreignKey: 'cotizacion_id', as: 'cotizacion' });
CotizacionDetalle.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
User.hasMany(AreaGrant, { foreignKey: 'user_id', as: 'area_grants' });
AreaGrant.belongsTo(User, { foreignKey: 'user_id', as: 'grantee' });
User.hasMany(AccessRequest, { foreignKey: 'user_id', as: 'access_requests' });
AccessRequest.belongsTo(User, { foreignKey: 'user_id', as: 'requester' });
Oferta.belongsTo(Producto, {
  foreignKey: "id_producto",
  as: "producto",
});

// Función para poblar la tabla de roles si está vacía
async function seedRoles() {
  const roles = [
      { id_role: 1, name: "Gerente" },
      { id_role: 2, name: "Administrador" },
      { id_role: 3, name: "Vendedor" },
      { id_role: 4, name: "No Autorizado" },
      { id_role: 5, name: "Auditor temporal" },
      { id_role: 6, name: "Técnico" },
  ];
  for (const role of roles) await Role.findOrCreate({ where: { id_role: role.id_role }, defaults: role });
}

const LibroReclamaciones = require("./libro_reclamaciones.model");
const SolicitudImportacion = require("./solicitud_importacion.model");
const SolicitudEnsamble = require("./solicitud_ensamble.model");
const SolicitudImportacionHistorial = require("./solicitud_importacion_historial.model");
const SolicitudEnsambleHistorial = require("./solicitud_ensamble_historial.model");

module.exports = {
  sequelize,
  Categoria,
  Producto,
  User,
  Company,
  Venta,
  SerieComprobante,
  DetalleVenta,
  CodigoBarras,
  Role,
  CierreCaja,
  AuditLog,
  Oferta,
  Banner,
  Tarjeta,
  LibroReclamaciones,
  SolicitudImportacion,
  SolicitudEnsamble,
  SolicitudImportacionHistorial,
  SolicitudEnsambleHistorial,
  Pedido,
  PedidoDetalle,
  Pago,
  DocumentoElectronico,
  AdquisicionUsado,
  GastoTaller,
  Importacion,
  OrdenServicio,
  OrdenServicioEvento,
  OrdenServicioPago,
  OrdenServicioRepuesto,
  OrdenServicioEvidencia,
  OrdenServicioCotizacion,
  OrdenServicioDiagnostico,
  OrdenServicioMensaje,
  OrdenServicioCanalEvento,
  ClienteServicio,
  ActivoTecnico,
  OrdenServicioCredencial,
  SolicitudServicio,
  AdquirentePos,
  PagoPos,
  AffiliateBusiness,
  AffiliateSettlement,
  AffiliatePayment,
  CarritoItem,
  PedidoVenta,
  Proveedor,
  Compra,
  CompraDetalle,
  MovimientoInventario,
  InventarioUbicacion,
  InventarioQuant,
  InventarioReserva,
  Cotizacion,
  CotizacionDetalle,
  AreaGrant,
  AccessRequest,
  PaymentGateway,
  BlogPost,
  SolicitudPostventa,
  SolicitudPostventaHistorial,
  seedRoles,
};
