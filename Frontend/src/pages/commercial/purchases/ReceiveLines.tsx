import { Package, X } from "lucide-react"
import { I, SEP, money } from "./purchasesShared"
import { costOf, qtyOf, type DraftLine } from "./receiveCalc"

type Row = { asig: number; sub: number; pen: number }
interface Props { lines: DraftLine[]; rows: Row[]; usd: boolean; mob: boolean; onChange: (key: string, p: Partial<DraftLine>) => void; onRemove: (key: string) => void }

export function ReceiveLines({ lines, rows, usd, mob, onChange, onRemove }: Props) {
  const cur = usd ? "USD" : "PEN"
  if (!lines.length) return (
    <div className="noline"><div className="ei">{I(Package, 22)}</div><b>Aún no hay líneas</b><span>Escanea un código o busca un producto para agregar la primera.</span></div>
  )
  const qty = (l: DraftLine) => (
    <input className="in r num" value={l.q} inputMode="numeric" aria-label={`Cantidad de ${l.nombre}`} onChange={e => onChange(l.key, { q: e.target.value.replace(/\D/g, "") })} />
  )
  const cost = (l: DraftLine) => (
    <input className={`in r num${costOf(l) <= 0 ? " bad" : ""}`} value={l.c} inputMode="decimal" aria-label={`Costo unitario de ${l.nombre}`} onChange={e => onChange(l.key, { c: e.target.value.replace(/[^0-9.]/g, "") })} />
  )
  const rm = (l: DraftLine) => <button type="button" className="ib" aria-label={`Quitar ${l.nombre}`} onClick={() => onRemove(l.key)}>{I(X, 18)}</button>
  const name = (l: DraftLine) => <><div style={{ fontWeight: 600, lineHeight: 1.3 }}>{l.nombre}</div><div className="sub num">{l.sku}{SEP}Stock {l.stock}</div></>
  if (mob) return (
    <div style={{ marginTop: 8 }}>{lines.map((l, i) => (
      <div className="lc" key={l.key}>
        <div className="l1"><div>{name(l)}</div>{rm(l)}</div>
        <div className="l2">
          <div className="ff"><div className="lb" style={{ fontSize: 12.5, fontWeight: 600 }}>Cantidad</div>{qty(l)}</div>
          <div className="ff"><div className="lb" style={{ fontSize: 12.5, fontWeight: 600 }}>Costo unitario</div>{cost(l)}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
          <span>Asignado <b className="num">{money(rows[i].asig, cur)}</b></span><span>Subtotal <b className="num">{money(rows[i].sub, cur)}</b></span>
        </div>
      </div>
    ))}</div>
  )
  return (
    <table className="lt">
      <colgroup><col /><col style={{ width: 96 }} /><col style={{ width: 120 }} /><col style={{ width: 120 }} /><col style={{ width: 120 }} /><col style={{ width: 44 }} /></colgroup>
      <thead><tr><th scope="col">Producto</th><th scope="col" className="r">Cantidad</th><th scope="col" className="r">Costo unitario</th><th scope="col" className="r">Costo asignado</th><th scope="col" className="r">Subtotal</th><th scope="col"><span className="pgx">Quitar</span></th></tr></thead>
      <tbody>{lines.map((l, i) => (
        <tr key={l.key}>
          <td>{name(l)}</td><td>{qty(l)}</td><td>{cost(l)}</td>
          <td className="r num">{money(rows[i].asig, cur)}{usd && <span className="usd">{money(rows[i].pen, "PEN")}</span>}</td>
          <td className="sb num">{money(rows[i].sub, cur)}{qtyOf(l) < 1 && <span className="usd">Cantidad mínima 1</span>}</td>
          <td>{rm(l)}</td>
        </tr>
      ))}</tbody>
    </table>
  )
}
