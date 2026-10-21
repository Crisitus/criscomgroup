import api from '../lib/api';

// Interfaces para Banner - Ajustado según el backend
export interface Banner {
  id_banner?: number;
  imagen_url: string | null;
  whatsapp: string | null;
  media_type?: 'image' | 'video';
  titulo?: string | null;
  activo?: boolean;
  orden?: number;
  creado_en?: string;
  actualizado_en?: string;
}

export interface BannerFormData {
  imagen?: File;
  whatsapp?: string;
  titulo?: string;
  activo?: boolean;
  orden?: number;
}

// Interfaces para Tarjetas - Ajustado según el backend
export interface Tarjeta {
  id_tarjeta: number;
  titulo: string;
  descripcion: string | null;
  imagen_url: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface TarjetaFormData {
  titulo: string;
  descripcion?: string;
  imagen?: File;
}

// Mensaje legible desde la respuesta del backend (message / error), con respaldo por estado HTTP
export const getApiErrorMessage = (error: any, fallback: string): string => {
  const data = error?.response?.data
  if (typeof data?.message === 'string' && data.message) return data.message
  if (typeof data?.error === 'string' && data.error) return data.error
  if (error?.response?.status === 403) return 'No tienes permiso para realizar esta acción en este momento'
  return error?.message || fallback
}

// ==== FUNCIONES PARA TARJETAS ====

export const getTarjetas = async (): Promise<Tarjeta[]> => {
  try {
    const { data } = await api.get(`/marketing/tarjetas`);
    // Asegura que siempre se retorne un array
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    throw error;
  }
};

export const getTarjetaById = async (id: number): Promise<Tarjeta> => {
  try {
    // Validar que el ID sea un número válido
    if (id === undefined || id === null || isNaN(Number(id))) {
      throw new Error("ID de tarjeta no válido");
    }

    const { data } = await api.get(`/marketing/tarjetas/${id}`);
    return data;
  } catch (error: any) {
    throw error;
  }
};

export const createTarjeta = async (data: TarjetaFormData): Promise<Tarjeta> => {
  try {
    if (data.imagen) {
      const formData = new FormData();
      formData.append('titulo', data.titulo);
      if (data.descripcion) formData.append('descripcion', data.descripcion);
      formData.append('imagen_tarjeta', data.imagen);
      
      const { data: responseData } = await api.post(`/marketing/tarjetas`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return responseData.tarjeta || responseData;
    } else {
      const { data: responseData } = await api.post(`/marketing/tarjetas`, {
        titulo: data.titulo,
        descripcion: data.descripcion
      });
      return responseData.tarjeta || responseData;
    }
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error("No tienes permiso para realizar esta acción en este momento");
    }
    throw error;
  }
};

export const updateTarjeta = async (id: number, data: TarjetaFormData): Promise<Tarjeta> => {
  try {
    // Validar que el ID sea un número válido
    if (id === undefined || id === null || isNaN(Number(id))) {
      throw new Error("ID de tarjeta no válido");
    }

    if (data.imagen) {
      const formData = new FormData();
      formData.append('titulo', data.titulo);
      if (data.descripcion) formData.append('descripcion', data.descripcion);
      formData.append('imagen_tarjeta', data.imagen);
      
      const { data: responseData } = await api.put(`/marketing/tarjetas/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return responseData.tarjeta || responseData;
    } else {
      const { data: responseData } = await api.put(`/marketing/tarjetas/${id}`, {
        titulo: data.titulo,
        descripcion: data.descripcion
      });
      return responseData.tarjeta || responseData;
    }
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error("No tienes permiso para realizar esta acción en este momento");
    }
    throw error;
  }
};

export const deleteTarjetaImage = async (id: number): Promise<Tarjeta> => {
  try {
    // Validar que el ID sea un número válido
    if (id === undefined || id === null || isNaN(Number(id))) {
      throw new Error("ID de tarjeta no válido");
    }

    const { data } = await api.delete(`/marketing/tarjetas/${id}/imagen`);
    return data.tarjeta || data;
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error("No tienes permiso para realizar esta acción en este momento");
    }
    throw error;
  }
};

export const deleteTarjeta = async (id: number): Promise<void> => {
  try {
    // Validar que el ID sea un número válido
    if (id === undefined || id === null || isNaN(Number(id))) {
      throw new Error("ID de tarjeta no válido");
    }

    await api.delete(`/marketing/tarjetas/${id}`);
  } catch (error: any) {
    if (error.response?.status === 403) {
      throw new Error("No tienes permiso para realizar esta acción en este momento");
    }
    throw error;
  }
};

// ==== FUNCIONES PARA MULTIPLES BANNERS (CARRUSEL) ====

export const getBanners = async (): Promise<Banner[]> => {
  try {
    const { data } = await api.get(`/marketing/banners`);
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    throw error;
  }
};

export const getBannerById = async (id: number): Promise<Banner> => {
  try {
    const { data } = await api.get(`/marketing/banners/${id}`);
    return data;
  } catch (error: any) {
    throw error;
  }
};

const buildBannerForm = (data: BannerFormData): FormData => {
  const formData = new FormData()
  if (data.imagen) formData.append('imagen_banner', data.imagen)
  if (data.titulo !== undefined) formData.append('titulo', data.titulo)
  if (data.activo !== undefined) formData.append('activo', String(data.activo))
  if (data.orden !== undefined) formData.append('orden', String(data.orden))
  if (data.whatsapp !== undefined) formData.append('whatsapp', data.whatsapp)
  return formData
}

export const createBannerCarrusel = async (data: BannerFormData): Promise<Banner> => {
  if (!data.imagen) throw new Error('Se requiere una imagen para crear el banner')
  try {
    const { data: responseData } = await api.post(`/marketing/banners`, buildBannerForm(data), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return responseData.banner || responseData
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'No se pudo crear el banner'))
  }
}

export const updateBannerCarrusel = async (id: number, data: BannerFormData): Promise<Banner> => {
  try {
    const { data: responseData } = await api.put(`/marketing/banners/${id}`, buildBannerForm(data), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return responseData.banner || responseData
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'No se pudo actualizar el banner'))
  }
}

export const setBannerActivo = async (id: number, activo: boolean): Promise<Banner> => {
  try {
    const { data } = await api.patch(`/marketing/banners/${id}/activo`, { activo })
    return data.banner || data
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'No se pudo cambiar el estado del banner'))
  }
}

export const reorderBanners = async (orden: Array<{ id: number; orden: number }>): Promise<Banner[]> => {
  try {
    const { data } = await api.patch(`/marketing/banners/reordenar`, { orden })
    return Array.isArray(data?.banners) ? data.banners : []
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'No se pudo guardar el orden'))
  }
}

export const deleteBannerCarrusel = async (id: number): Promise<void> => {
  try {
    await api.delete(`/marketing/banners/${id}`)
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, 'No se pudo eliminar el banner'))
  }
}
