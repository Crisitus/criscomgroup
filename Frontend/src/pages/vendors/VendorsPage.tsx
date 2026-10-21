import UsrPage from "./usuarios/UsrPage"

/** Entrada fina de «Usuarios y afiliados» (/vendors y pestaña «Usuarios y roles» de Empresa). */
export default function VendorsPage({ embedded }: { embedded?: boolean }) {
  return <UsrPage embedded={embedded} />
}
