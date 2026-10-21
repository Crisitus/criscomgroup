export type Form = {
  s: Record<string, string>
  propiedad: boolean
  nohab: boolean
  producto: number | null
  ingresar: boolean
}
export const EMPTY: Form = {
  s: {
    tipo_operacion: "compra", transferente_tipo_documento: "DNI", transferente_numero_documento: "", transferente_nombre: "", transferente_contacto: "",
    monto_adquisicion: "", medio_pago: "", referencia_pago: "", tipo_componente: "equipo_completo", marca: "", modelo: "", numero_serie: "", capacidad: "",
    estado_recepcion: "", accesorios: "", prueba_funcional: "pendiente", smart_salud_porcentaje: "", tbw_escrito: "", tbw_nominal: "", horas_encendido: "",
    ciclos_encendido: "", ciclos_bateria: "", capacidad_bateria_diseno: "", capacidad_bateria_actual: "", observaciones_tecnicas: "",
    procedencia_declarada: "", formulario_820: "",
  },
  propiedad: false, nohab: true, producto: null, ingresar: false,
}
export const REQ: Record<number, [string, string][]> = {
  1: [["transferente_numero_documento", "El número de documento es obligatorio."], ["transferente_nombre", "El nombre o razón social es obligatorio."]],
  2: [["marca", "La marca es obligatoria."], ["modelo", "El modelo es obligatorio."], ["numero_serie", "El número de serie es obligatorio."], ["estado_recepcion", "El estado de recepción es obligatorio."]],
  3: [],
  4: [["procedencia_declarada", "La procedencia declarada es obligatoria."]],
}
export const NUMS = ["smart_salud_porcentaje", "tbw_escrito", "tbw_nominal", "horas_encendido", "ciclos_encendido", "ciclos_bateria", "capacidad_bateria_diseno", "capacidad_bateria_actual"]
/** Cuerpo para evaluar / crear. Cadenas vacías pasan: el backend las trata como null. */
export function toBody(f: Form): Record<string, unknown> {
  const o: Record<string, unknown> = { ...f.s }
  if (f.s.tipo_operacion !== "compra") o.monto_adquisicion = "0"
  o.declaracion_propiedad = f.propiedad
  o.declaracion_no_habitual = f.nohab
  return o
}
export const stepOfError = (m: string) => /serie|componente|marca|modelo|recepci/i.test(m) ? 2 : /monto|compra|donaci|cesi|documento/i.test(m) ? 1 : /smart|tbw|bater|ciclos|horas|prueba|capacidad de dise/i.test(m) ? 3 : /producto|stock|inventario/i.test(m) ? 4 : 0
