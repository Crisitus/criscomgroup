import { useEffect, useRef, useState } from "react"
import { CircleAlert, Loader2, Shuffle } from "lucide-react"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import { generarCodigoBarrasAleatorio, verificarCodigoBarrasExiste } from "../../../services/codigoBarrasService"
import { Field, Opts } from "./fields"
import { I, Q, errMsg, intOf } from "./shared"

type Mode = "escanear" | "generar"

/** Agrega un codigo en memoria (pendiente hasta Guardar). Valida duplicados locales y globales. */
export function DlgAddCode({ name, stock, suma, taken, onClose, onAdd }: {
  name: string
  stock: number
  suma: number
  taken: string[]
  onClose: () => void
  onAdd: (codigo: string, cantidad: number) => void
}) {
  const [mode, setMode] = useState<Mode>("escanear")
  const [code, setCode] = useState("")
  const [qty, setQty] = useState("1")
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const n = intOf(qty)
  const qtyOk = !Number.isNaN(n) && n >= 1

  useEffect(() => { input.current?.focus() }, [])

  const generate = async () => {
    setBusy(true); setErr("")
    try { setCode((await generarCodigoBarrasAleatorio()).slice(0, 13)); input.current?.focus() }
    catch { setErr("No se pudo generar un código único. Intenta de nuevo.") }
    finally { setBusy(false) }
  }
  const pick = (m: Mode) => { setMode(m); setErr(""); if (m === "generar" && !code) void generate() }

  const submit = async () => {
    const c = code.trim()
    if (!c || !qtyOk || busy) return
    if (taken.includes(c)) return void setErr(`El código ${c} ya está en este producto.`)
    setBusy(true); setErr("")
    try {
      if (await verificarCodigoBarrasExiste(c)) { setErr(`El código ${c} ya pertenece a otro producto. Cada código solo puede estar en un producto.`); return }
      onAdd(c, n)
    } catch (e) { setErr(errMsg(e, "No se pudo verificar el código")) }
    finally { setBusy(false) }
  }
  const can = !!code.trim() && qtyOk && !busy
  return (
    <ErpDialog open onOpenChange={o => { if (!o) onClose() }} title="Agregar código de barras" description={`${name} · stock actual ${stock}`}>
      <div className="pg-ficha dlgw">
        <form className="dlg" onSubmit={e => { e.preventDefault(); void submit() }}>
          <Opts label="Cómo ingresarlo" value={mode} onChange={pick} items={[["escanear", "Escanear"], ["generar", "Generar"]]} />
          <div className="g2 gq">
            <Field label="Código" error={err || undefined} hint={<span className="hint">{mode === "escanear" ? "Escanea o escribe el código. Debe ser único en todo el sistema." : "Se generó un código único; puedes editarlo."}</span>}>
              <input ref={input} className="in mono" value={code} aria-invalid={!!err} autoComplete="off" onChange={e => { setCode(e.target.value); setErr("") }} />
            </Field>
            <Field label="Cantidad" error={qty !== "" && !qtyOk ? "Entero de 1 o más" : undefined}>
              <input className="in num" inputMode="numeric" value={qty} aria-invalid={!qtyOk} onChange={e => setQty(e.target.value)} />
            </Field>
          </div>
          {mode === "generar" && <button type="button" className="btn out sm" style={{ alignSelf: "start" }} aria-disabled={busy} onClick={() => { if (!busy) void generate() }}>{I(busy ? Loader2 : Shuffle, 16, busy ? "spin" : "")}Generar otro</button>}
          {!err && qtyOk && code.trim() && <div className="note" role="status">{I(CircleAlert)}<span>Queda pendiente hasta pulsar {Q("Guardar")}. El stock pasará de {stock} a {suma + n}.</span></div>}
          <div className="acts">
            <button type="button" className="btn out" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn" aria-disabled={!can}>{busy ? "Verificando…" : "Agregar código"}</button>
          </div>
        </form>
      </div>
    </ErpDialog>
  )
}
