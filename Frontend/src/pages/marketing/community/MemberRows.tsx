import { CircleCheck, UserMinus } from "lucide-react"
import type { CommunityMember } from "../../../services/communityService"
import { Btn } from "./Btn"
import { DASH, I, fd } from "./comShared"

const Name = ({ m }: { m: CommunityMember }) => (m.nombre ? <>{m.nombre}</> : <span className="mut">Sin nombre</span>)
export const MemberState = ({ m }: { m: CommunityMember }) => (m.estado === "activo"
  ? <span className="st ok">{I(CircleCheck, 14)}Activo</span>
  : <span className="st neu">{I(UserMinus, 14)}Baja</span>)
const BajaBtn = ({ m, onBaja }: { m: CommunityMember; onBaja: (m: CommunityMember) => void }) => (m.estado === "activo"
  ? <Btn cls="out sm" icon={UserMinus} onClick={() => onBaja(m)}>Dar de baja</Btn>
  : <Btn cls="out sm" why={`wb${m.id_subscriber}`}>Ya de baja</Btn>)

export function MemberTable({ rows, onBaja }: { rows: CommunityMember[]; onBaja: (m: CommunityMember) => void }) {
  return (
    <table className="tb">
      <colgroup><col /><col style={{ width: 120 }} /><col style={{ width: 110 }} /><col style={{ width: 130 }} /><col style={{ width: 130 }} /><col style={{ width: 140 }} /></colgroup>
      <thead><tr><th scope="col">Miembro</th><th scope="col">Estado</th><th scope="col">Fuente</th><th scope="col">Consentimiento</th><th scope="col">Baja</th><th scope="col">Acción</th></tr></thead>
      <tbody>
        {rows.map(m => (
          <tr key={m.id_subscriber}>
            <td><div className="stk"><span className="nm"><Name m={m} /></span><span className="sub">{m.email}</span></div></td>
            <td><MemberState m={m} /></td>
            <td><span className="tag">{m.fuente}</span></td>
            <td className="num">{fd(m.consentimiento_en)}</td>
            <td className="num">{m.baja_en ? fd(m.baja_en) : <span className="mut">{DASH}</span>}</td>
            <td><BajaBtn m={m} onBaja={onBaja} />{m.estado !== "activo" && <span className="sr" id={`wb${m.id_subscriber}`}>Este miembro ya está de baja.</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function MemberCards({ rows, onBaja }: { rows: CommunityMember[]; onBaja: (m: CommunityMember) => void }) {
  return (
    <div className="stack">
      {rows.map(m => (
        <div className="cc" key={m.id_subscriber}>
          <div className="top"><div className="stk"><span className="nm"><Name m={m} /></span><span className="sub" style={{ overflowWrap: "anywhere" }}>{m.email}</span></div><MemberState m={m} /></div>
          <div className="mrow">
            <span className="sub"><span className="tag" style={{ marginRight: 6 }}>{m.fuente}</span>Consentimiento {fd(m.consentimiento_en)}{m.baja_en && <><br />Baja {fd(m.baja_en)}</>}</span>
            <BajaBtn m={m} onBaja={onBaja} />
            {m.estado !== "activo" && <span className="sr" id={`wb${m.id_subscriber}`}>Este miembro ya está de baja.</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
