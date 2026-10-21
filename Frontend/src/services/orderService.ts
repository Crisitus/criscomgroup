import api from "../lib/api"

export type OrderStatus = "pendiente_pago" | "confirmado" | "preparando" | "enviado" | "entregado" | "cancelado"
export type PaymentStatus = "pendiente" | "pagado" | "fallido" | "devuelto"

export interface OrderItem { producto_id?: number; producto_nombre: string; cantidad: number; precio_unitario_con_igv?: string; subtotal_con_igv?: string; condicion?: string; garantia_meses?: number }
export interface OrderPayment { id_pago: number; proveedor: "culqi" | "manual"; proveedor_id?: string | null; monto_centimos: number; estado: string; respuesta_segura?: { reference?: string | null } | null; creado_en: string }
export interface Order {
  id_pedido: number; numero_pedido: string
  cliente_nombre: string; cliente_email: string; cliente_telefono: string
  cliente_documento_tipo?: string | null; cliente_documento_numero?: string | null; razon_social?: string | null
  tipo_entrega: "domicilio" | "recojo_tienda"
  direccion_envio?: string | null; direccion_departamento?: string | null; direccion_provincia?: string | null; direccion_distrito?: string | null; direccion_referencia?: string | null
  metodo_pago: string; estado: OrderStatus; estado_pago: PaymentStatus
  tipo_comprobante: string
  subtotal: string; costo_envio: string; recargo_tarjeta: string; total_final: string
  notas_cliente?: string | null; fecha_creacion: string; fecha_actualizacion: string; venta_id?: number | null
  detalles?: OrderItem[]
}

export const fetchAdminOrders = async () => (await api.get<{ pedidos: Order[] }>("/pedidos/admin/listado")).data.pedidos
export const fetchAdminPayments = async () => (await api.get<{ pagos: Array<OrderPayment & { id_pedido: number }> }>("/pedidos/admin/pagos")).data.pagos
export const fetchDeliveries = async () => (await api.get<{ deliveries: Order[] }>("/pedidos/admin/deliveries")).data.deliveries
export const updateOrderStatus = async (id: number, estado: OrderStatus) => (await api.patch(`/pedidos/admin/${id}/estado`, { estado })).data
export const confirmManualPayment = async (id: number, referencia?: string) => (await api.post(`/pedidos/${id}/confirmar-pago-manual`, { referencia: referencia || undefined })).data
export const deleteOrder = async (id: number) => (await api.delete(`/pedidos/admin/${id}`)).data

/** Horas transcurridas desde que se creó el pedido. */
export const hoursSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000))
/** El backend elimina cada 15 min los pedidos sin pagar con más de 24 h. */
export const hoursToExpire = (order: Order) => (order.estado_pago === "pagado" || order.venta_id ? null : Math.max(0, 24 - hoursSince(order.fecha_creacion)))
export const errorMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
  return message || fallback
}
