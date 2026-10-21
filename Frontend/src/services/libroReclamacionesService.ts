import api from '../lib/api';

export type EstadoReclamacion = 'pendiente' | 'en_proceso' | 'respondido' | 'archivado';
export type TipoReclamacion = 'reclamo' | 'queja';

export interface ReclamacionResumen {
  total: number;
  por_estado: Record<EstadoReclamacion, number>;
  vencidos: number;
  por_vencer: number;
}

// Fila del listado (sin documento, domicilio ni detalle completo).
export interface ReclamacionFila {
  id_reclamo: number;
  codigo: string | null;
  tipo: TipoReclamacion | null;
  estado: EstadoReclamacion;
  nombre: string;
  email: string;
  tipo_bien: 'producto' | 'servicio' | null;
  bien: string | null;
  monto: number | null;
  fecha: string;
  fecha_vencimiento: string | null;
  fecha_respuesta: string | null;
  dias_restantes: number | null;
  vencido: boolean;
  por_vencer: boolean;
  respondido_en_plazo: boolean | null;
  extracto: string;
}

// Detalle (GET /:id y respuesta del PUT).
export interface Reclamacion extends Omit<ReclamacionFila, 'extracto'> {
  telefono: string | null;
  documento: string | null;
  domicilio: string | null;
  es_menor: boolean;
  apoderado: string | null;
  pedido: string | null;
  descripcion: string;
  respuesta: string | null;
  respondido_por: number | null;
  correo?: 'enviado' | 'omitido' | 'error';
}

export interface ReclamacionesPage {
  rows: ReclamacionFila[];
  total: number;
  page: number;
  limit: number;
  resumen: ReclamacionResumen;
}

export interface ReclamacionesParams {
  page?: number;
  limit?: number;
  estado?: EstadoReclamacion | '';
  tipo?: TipoReclamacion | '';
  q?: string;
  vencido?: boolean;
}

const limpiar = (params: ReclamacionesParams) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== false));

export const getReclamaciones = async (params: ReclamacionesParams = {}): Promise<ReclamacionesPage> => {
  const { data } = await api.get('/libro-reclamaciones', { params: limpiar(params) });
  return data;
};

export const getReclamacion = async (id: number): Promise<Reclamacion> => {
  const { data } = await api.get(`/libro-reclamaciones/${id}`);
  return data;
};

// Solo se envian estado y respuesta (la respuesta es obligatoria al pasar a "respondido").
export const updateReclamacion = async (id: number, cambios: { estado: EstadoReclamacion; respuesta?: string }): Promise<Reclamacion> => {
  const { data } = await api.put(`/libro-reclamaciones/${id}`, cambios);
  return data;
};

export const updateEstadoReclamacion = (id: number, estado: EstadoReclamacion) => updateReclamacion(id, { estado });

export const exportReclamacionesCsv = async (params: ReclamacionesParams = {}): Promise<Blob> => {
  const { data } = await api.get('/libro-reclamaciones/export.csv', { params: limpiar(params), responseType: 'blob' });
  return data;
};

export const mensajeError = (error: unknown, porDefecto: string): string => {
  const data = (error as { response?: { data?: { message?: string; errores?: Record<string, string> } } })?.response?.data;
  const campos = data?.errores ? Object.values(data.errores).join(' ') : '';
  return [data?.message, campos].filter(Boolean).join(' ') || porDefecto;
};

export default {
  getReclamaciones,
  getReclamacion,
  updateReclamacion,
  updateEstadoReclamacion,
  exportReclamacionesCsv,
  mensajeError,
};
