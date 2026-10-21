import api from "../lib/api"

export type TipoExportacion = "tickets_pdf" | "productos_excel"

export interface RegistroExportacion {
  tipo: TipoExportacion
  cantidad: number
  filtros?: Record<string, string | number | boolean>
}

/** Deja constancia en auditoria de una exportacion hecha en el navegador (sin datos de productos). */
export const registrarExportacion = async (registro: RegistroExportacion): Promise<void> => {
  await api.post("/productos/exportaciones/registro", registro)
}
