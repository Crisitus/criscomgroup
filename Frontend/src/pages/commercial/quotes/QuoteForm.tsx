import { useState, type ReactNode } from "react"
import { ArrowLeft, ChevronDown, ChevronRight, CircleAlert, Info, Send } from "lucide-react"
import { toast } from "sonner"
import { commercialApi } from "../../../services/commercialService"
import { ESCENARIOS, I, MINUS, errMsg, money, pl, sgn, waText, waUrl, type Quote, type StockProduct } from "./quotesShared"
import { MargenNeg } from "./QuoteList"
import { QuoteFormLines } from "./QuoteFormLines"
import { blankForm, calc, canWa, validate, type FormLine, type FormState } from "./quoteFormCalc"

const Err = ({ id, t }: { id: string; t?: string }) => t ? <span className="err" id={id}>{I(CircleAlert, 14)}<span>{t}</span></span> : null

function Field({ label, req, err, id, children }: { label: string; req?: boolean; err?: string; id: string; children: ReactNode }) {
  return <label className="fld"><span>{label}{req && <> <i>*</i></>}</span>{children}<Err id={id} t={err} /></label>
}

export function QuoteForm({ products, onCancel, onSaved }: { products: StockProduct[]; onCancel: () => void; onSaved: (q: Quote, sent: boolean) => void }) {
  const [f, setF] = useState<FormState>(blankForm)
  const [busy, setBusy] = useState(false)
  const [srv, setSrv] = useState("")
  const set = (p: Partial<FormState>) => setF(c => ({ ...c, ...p }))
  const errs = validate(f, products), ne = Object.keys(errs).length
  const shown = f.tried ? errs : {}
  const k = calc(f, products)
  const setLine = (id: number, p: Partial<FormLine>) => setF(c => ({ ...c, lines: c.lines.map(l => l.id === id ? { ...l, ...p } : l) }))
  const add = (id: number) => {
    const p = products.find(x => x.id_producto === id)
    if (p) setF(c => ({ ...c, lines: [...c.lines, { id, cant: "1", precio: String(Number(p.precio_unitario_con_igv)) }] }))
  }
  const del = (id: number) => setF(c => ({ ...c, lines: c.lines.filter(l => l.id !== id) }))

  const save = async (estado: "borrador" | "enviada") => {
    if (busy) return
    if (ne) { set({ tried: true }); return }
    if (estado === "enviada" && !canWa(f)) return
    setBusy(true); setSrv("")
    const pop = estado === "enviada" ? window.open("about:blank", "_blank") : null
    if (pop) pop.opener = null
    try {
      const q: Quote = await commercialApi.createQuote({
        cliente_nombre: f.nombre.trim(), cliente_documento: f.doc.trim(), cliente_email: f.mail.trim(), cliente_telefono: f.tel.trim(),
        escenario: f.esc, vigencia_dias: Number(f.vig), descuento: k.desc, notas: f.notas.trim(), estado,
        items: f.lines.map(l => ({ producto_id: l.id, cantidad: Number(l.cant), precio_unitario: Number(l.precio) })),
      })
      if (pop) pop.location.href = waUrl(f.tel, waText(q))
      onSaved(q, estado === "enviada")
    } catch (e) {
      pop?.close()
      const m = errMsg(e, "No se pudo crear la cotización")
      setSrv(m); toast.error(m)
    } finally { setBusy(false) }
  }
  const waOff = !canWa(f)
  const why = ne && f.tried ? <p className="err" id="fe-why" role="alert">{I(CircleAlert, 16)}<span>Corrige {pl(ne, "error", "errores")} para guardar.</span></p>
    : srv ? <p className="err" id="fe-why" role="alert">{I(CircleAlert, 16)}<span>{srv}</span></p> : null
  return (
    <div className="sheet">
      <div className="hd"><h1>Nueva cotización</h1>
        <div className="ac"><button type="button" className="btn out" onClick={onCancel}>{I(ArrowLeft, 16)}Volver a Cotizaciones</button></div></div>
      <div className="sb">
        <div className="col">
          <section className="card sec" aria-labelledby="h-cli"><h3 id="h-cli">Cliente</h3>
            <Field label="Nombre del cliente" req id="e-nombre" err={shown.nombre}>
              <input className="in" value={f.nombre} aria-invalid={!!shown.nombre} aria-describedby={shown.nombre ? "e-nombre" : undefined} onChange={e => set({ nombre: e.target.value })} /></Field>
            <Field label="WhatsApp" id="e-tel">
              <input className="in" type="tel" inputMode="tel" value={f.tel} onChange={e => set({ tel: e.target.value })} /></Field>
            <button type="button" className="lnk" aria-expanded={f.more} style={{ alignSelf: "flex-start" }} onClick={() => set({ more: !f.more })}>{I(f.more ? ChevronDown : ChevronRight, 16)}Documento y correo</button>
            {f.more && <div className="g2">
              <Field label="DNI o RUC" id="e-doc"><input className="in" inputMode="numeric" value={f.doc} onChange={e => set({ doc: e.target.value })} /></Field>
              <Field label="Correo" id="e-mail" err={shown.mail}><input className="in" type="email" value={f.mail} aria-invalid={!!shown.mail} aria-describedby={shown.mail ? "e-mail" : undefined} onChange={e => set({ mail: e.target.value })} /></Field>
            </div>}
          </section>
          <section className="card sec" aria-labelledby="h-con"><h3 id="h-con">Condiciones</h3>
            <div className="fld" role="radiogroup" aria-labelledby="esc-l"><span id="esc-l">Escenario</span>
              <div className="opts">{ESCENARIOS.map(([v, l]) => <button type="button" key={v} className="opt" role="radio" aria-checked={f.esc === v} onClick={() => set({ esc: v })}>{l}</button>)}</div></div>
            <div className="g2">
              <Field label="Vigencia (días)" id="e-vig" err={shown.vig}><input className="in num" type="number" min={1} max={90} step={1} value={f.vig} aria-invalid={!!shown.vig} aria-describedby={shown.vig ? "e-vig" : undefined} onChange={e => set({ vig: e.target.value })} /></Field>
              <Field label="Descuento (S/)" id="e-desc" err={shown.desc}><input className="in num" type="number" min={0} step="0.01" value={f.desc} aria-invalid={!!shown.desc} aria-describedby={shown.desc ? "e-desc" : undefined} onChange={e => set({ desc: e.target.value })} /></Field>
            </div>
            <button type="button" className="lnk" aria-expanded={f.nOpen} style={{ alignSelf: "flex-start" }} onClick={() => set({ nOpen: !f.nOpen })}>{I(f.nOpen ? ChevronDown : ChevronRight, 16)}Notas</button>
            {f.nOpen && <label className="fld"><span className="sr">Notas</span><textarea className="ta" aria-label="Notas" value={f.notas} onChange={e => set({ notas: e.target.value })} /></label>}
          </section>
        </div>
        <div className="col"><QuoteFormLines lines={f.lines} products={products} errs={shown} onAdd={add} onSet={setLine} onDel={del} /></div>
      </div>
      <div className="sf">
        <div className="t hm"><span>Subtotal</span><b className="s num">{money(k.sub)}</b></div>
        <div className="t"><span>Descuento</span><b className="s num">{k.desc ? `${MINUS}${money(k.desc)}` : money(0)}</b></div>
        <div className="t"><span>Total</span><b className="num">{sgn(k.tot)}</b></div>
        <div className="t"><span>Margen neto</span><b className="s num">{f.lines.length ? (k.mg < 0 ? <MargenNeg n={k.mg} s={16} /> : money(k.mg)) : "—"}</b></div>
        <span className="sp" />
        {why}
        <div className="acs">
          <button type="button" className="btn out" aria-disabled={busy} aria-describedby={why ? "fe-why" : undefined} onClick={() => save("borrador")}>Guardar borrador</button>
          <span className="hw"><button type="button" className="btn" aria-disabled={busy || waOff} aria-describedby={waOff ? "wa-why" : why ? "fe-why" : undefined} onClick={() => save("enviada")}>{I(Send, 16)}Guardar y enviar</button></span>
        </div>
        {waOff && !why && <p className="why neu" id="wa-why">{I(Info, 16)}<span>Para enviar, escribe un WhatsApp válido (9 dígitos o con código de país).</span></p>}
      </div>
    </div>
  )
}
