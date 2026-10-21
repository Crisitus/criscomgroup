import { EmpEmpresaTab, type EmpTabProps } from "./empresa/EmpEmpresaTab"

/** Pestana Empresa (entrada fina): el formulario vive en ./empresa. */
export default function CompanyPage(props: EmpTabProps) {
  return <EmpEmpresaTab {...props} />
}
