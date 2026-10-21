import type { EmpTabProps } from "./empresa/EmpEmpresaTab"
import { EmpHorarioTab } from "./empresa/EmpHorarioTab"

/** Pestana Horario (entrada fina): el horario laboral vive en ./empresa. */
export default function BusinessHoursPage(props: EmpTabProps) {
  return <EmpHorarioTab {...props} />
}
