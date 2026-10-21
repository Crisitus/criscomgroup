import type { ReactNode } from "react"
import { CircleAlert, CircleCheck, FlaskConical, Plug, Rocket, TriangleAlert, type LucideIcon } from "lucide-react"
import type { IntegrationStatus } from "../../../services/companyService"
import type { Block } from "./useSunData"
import { BlockError } from "./SunBlocks"
import { I } from "./sunShared"
import { origen } from "./sunCommon"

type Sunat = IntegrationStatus["sunat"]

const Cell = ({ label, Icon, tone, value, lines }: { label: string; Icon: LucideIcon; tone: string; value: string; lines: ReactNode[] }) => (
  <div className="cell">
    <div className="r1">{label}</div>
    <div className="v"><span className={`tn ${tone}`}>{I(Icon, 20)}</span><span>{value}</span></div>
    {lines.map((l, i) => <div className="s" key={i}>{l}</div>)}
  </div>
)

const Skel = () => (
  <div className="cell" style={{ gap: 8 }}>
    <span className="skb" style={{ width: 90, height: 12 }} /><span className="skb" style={{ width: 130, height: 22 }} /><span className="skb" style={{ width: 100, height: 12 }} />
  </div>
)

export function SunStrip({ block, onRetry }: { block: Block<Sunat>; onRetry: () => void }) {
  if (block.status === "loading") return <section className="strip" aria-busy="true" aria-label="Estado de la conexión: cargando"><Skel /><Skel /><Skel /><Skel /></section>
  if (block.status !== "ok" || !block.data) return <BlockError status={block.status} what="el estado de la conexión" message={block.message} onRetry={onRetry} />
  const c = block.data
  const prod = c.mode === "production"
  const consequence = !c.connected ? "Sin certificado no se puede emitir en Producción" : c.certificate ? "Credenciales y certificado completos" : "En Producción no podrá emitir hasta cargar el certificado"
  return (
    <section className="strip" aria-label="Estado de la conexión">
      <Cell label="Modo" Icon={prod ? Rocket : FlaskConical} tone="neu" value={prod ? "Producción" : "Pruebas (beta)"}
        lines={[c.mode_valid ? "Lo define el servidor · solo lectura" : <><span className="tn warn">{I(TriangleAlert, 14)}</span>Valor no válido en el servidor: se usa pruebas</>]} />
      <Cell label="Credenciales SOL" Icon={c.credentials ? CircleCheck : CircleAlert} tone={c.credentials ? "ok" : "warn"} value={c.credentials ? "Configuradas" : "Pendientes"} lines={[`Origen: ${origen(c.credentials_source)}`]} />
      <Cell label="Certificado" Icon={c.certificate ? CircleCheck : CircleAlert} tone={c.certificate ? "ok" : "warn"} value={c.certificate ? "Configurado" : "Pendiente"} lines={[`Origen: ${origen(c.certificate_source)}`, "Vigencia: no disponible aquí"]} />
      <Cell label="Conexión" Icon={c.connected ? Plug : CircleAlert} tone={c.connected ? "ok" : "warn"} value={c.connected ? "Lista" : "Incompleta"} lines={[consequence]} />
    </section>
  )
}
