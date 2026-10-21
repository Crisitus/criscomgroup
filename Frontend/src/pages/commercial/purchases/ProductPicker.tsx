import { useMemo, useState } from "react"
import { ScanLine } from "lucide-react"
import { toast } from "sonner"
import { CameraCodeScanner } from "../../../components/scanner/CameraCodeScanner"
import { buscarProductoPorCodigoBarras } from "../../../services/codigoBarrasService"
import { I, SEP, norm, type StockProduct } from "./purchasesShared"

export function ProductPicker({ products, onPick, mob }: { products: StockProduct[]; onPick: (p: StockProduct) => void; mob?: boolean }) {
  const [q, setQ] = useState("")
  const res = useMemo(() => {
    const t = norm(q.trim())
    return t ? products.filter(p => norm(`${p.nombre} ${p.sku}`).includes(t)).slice(0, 8) : []
  }, [q, products])

  const pick = (p: StockProduct) => { onPick(p); setQ("") }
  const byCode = async (code: string) => {
    try {
      const r = await buscarProductoPorCodigoBarras(code)
      const id = r?.producto?.id_producto
      const p = products.find(x => x.id_producto === id)
      if (!p) throw new Error("sin producto")
      pick(p)
      toast.success(`Producto agregado: ${p.nombre}`)
    } catch { toast.error(`No existe un producto registrado con el código ${code}`) }
  }
  const enter = () => {
    const t = q.trim()
    if (!t) return
    const exact = products.find(p => norm(p.sku) === norm(t))
    if (exact) pick(exact)
    else if (res.length === 1) pick(res[0])
    else if (!res.length) void byCode(t)
  }
  return (
    <div>
      <div className="scanrow">
        <label className="scan">{I(ScanLine, 20)}
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); enter() } }} placeholder={mob ? "Escanear o buscar" : "Escanear código o buscar producto"} aria-label="Escanear código o buscar producto" />
          {!mob && <span className="sub">Enter</span>}
        </label>
        <div className="cam"><CameraCodeScanner onDetected={byCode} label="Cámara" className="h-12" /></div>
      </div>
      {q.trim() && (
        <div className="scan-res" role="listbox" aria-label="Productos encontrados">
          {res.length ? res.map(p => (
            <button type="button" key={p.id_producto} role="option" aria-selected="false" onClick={() => pick(p)}>
              <span><span className="nm">{p.nombre}</span><br /><span className="sub num">{p.sku}{SEP}Stock {p.stock}</span></span>
            </button>
          )) : <div className="none">Sin coincidencias en el catálogo: Enter busca el código escaneado.</div>}
        </div>
      )}
    </div>
  )
}
