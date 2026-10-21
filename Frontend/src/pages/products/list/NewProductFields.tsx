import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp, ImageIcon, Shuffle, X } from "lucide-react"
import { generarSkuAleatorio } from "../../../services/skuService"
import { I, errMsg, type Cat } from "./prodShared"

export interface NewForm {
  sku: string; nombre: string; cat: string; precio: string; mayor: string; cond: "nuevo" | "segunda_mano"
  origen: "local" | "importado"; garantia: string; obs: string; desc: string
}
export const EMPTY: NewForm = { sku: "", nombre: "", cat: "", precio: "", mayor: "", cond: "nuevo", origen: "local", garantia: "12", obs: "", desc: "" }
const IMG_OK = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

export function NewProductFields({ f, set, cats, image, setImage, onErr }: {
  f: NewForm; set: (p: Partial<NewForm>) => void; cats: Cat[]; image: File | null; setImage: (x: File | null) => void; onErr: (m: string) => void
}) {
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image])
  const lab = (t: string, req?: boolean) => <span className="lb">{t}{req && <> <i aria-hidden="true">*</i></>}</span>
  const opts = <T extends string>(key: "cond" | "origen", items: [T, string][], label: string, onPick?: (v: T) => void) => (
    <div className="opts" role="radiogroup" aria-label={label}>
      {items.map(([v, l]) => <button type="button" key={v} className="opt" role="radio" aria-checked={f[key] === v} onClick={() => { set({ [key]: v } as Partial<NewForm>); onPick?.(v) }}>{l}</button>)}
    </div>
  )
  const genSku = async () => {
    if (!f.cat) { onErr("Elige primero la categoría para generar el SKU."); return }
    setBusy(true)
    try { set({ sku: await generarSkuAleatorio(Number(f.cat)) }) } catch (e) { onErr(errMsg(e, "No se pudo generar el SKU")) } finally { setBusy(false) }
  }
  const pick = (file?: File) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { onErr("La imagen supera 5 MB. Elige una más liviana."); return }
    if (!IMG_OK.includes(file.type)) { onErr("Tipo de archivo no válido. Solo JPG, PNG o WebP."); return }
    setImage(file)
  }
  return (
    <div className="frm">
      <label className="ff s4">{lab("Nombre", true)}<input className="in" value={f.nombre} onChange={e => set({ nombre: e.target.value })} placeholder="Nombre del producto" /></label>
      <div className="ff s2">{lab("Categoría", true)}
        <div style={{ position: "relative" }}>
          <select className="sl" aria-label="Categoría" value={f.cat} onChange={e => set({ cat: e.target.value })} style={{ appearance: "none", WebkitAppearance: "none", paddingRight: 34 }}>
            <option value="">Elige una categoría</option>{cats.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
          </select>
          <span style={{ position: "absolute", right: 10, top: 14, pointerEvents: "none", color: "hsl(var(--muted-foreground))" }}>{I(ChevronDown)}</span>
        </div>
      </div>
      <div className="ff s2">{lab("SKU", true)}
        <div className="codes" style={{ gridTemplateColumns: "minmax(0,1fr) 44px" }}>
          <input className="in" aria-label="SKU" value={f.sku} onChange={e => set({ sku: e.target.value })} placeholder="Código interno" />
          <button type="button" className="ib bd" aria-label="Generar SKU según la categoría" aria-disabled={busy} onClick={() => void genSku()}>{I(Shuffle, 18)}</button>
        </div>
      </div>
      <label className="ff s2">{lab("Precio con IGV", true)}<input className="in num" inputMode="decimal" value={f.precio} onChange={e => set({ precio: e.target.value })} placeholder="S/ 0.00" /></label>
      <label className="ff s2">{lab("Precio mayorista")}<input className="in num" inputMode="decimal" value={f.mayor} onChange={e => set({ mayor: e.target.value })} placeholder="S/ 0.00 (opcional)" /></label>
      <div className="ff s2">{lab("Condición")}{opts("cond", [["nuevo", "Nuevo"], ["segunda_mano", "Segunda mano"]], "Condición", v => set({ garantia: v === "segunda_mano" ? "3" : "12" }))}</div>
      <div className="ff s2">{lab("Origen")}{opts("origen", [["local", "Local"], ["importado", "Importado"]], "Origen")}</div>
      <label className="ff s2">{lab("Garantía (meses)")}<input className="in num" inputMode="numeric" value={f.garantia} onChange={e => set({ garantia: e.target.value })} /></label>
      <div className="s6">
        <button type="button" className="fold-h" aria-expanded={more} onClick={() => setMore(!more)}>{I(more ? ChevronUp : ChevronDown, 18)}Más detalles</button>
        {more && (
          <div className="frm" style={{ marginTop: 6 }}>
            <label className="ff s4">{lab("Estado, desgaste o reparaciones conocidas")}<textarea className="ta" value={f.obs} onChange={e => set({ obs: e.target.value })} placeholder="Obligatorio informar detalles relevantes en equipos usados" /></label>
            <div className="ff s2">{lab("Imagen")}
              <div className="upl" style={{ position: "relative" }}>
                {preview ? <img src={preview} alt="Vista previa" /> : I(ImageIcon, 18)}
                <label className="btn out sm" style={{ cursor: "pointer" }}>{image ? "Cambiar" : "Elegir imagen"}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => pick(e.target.files?.[0])} /></label>
                {image && <button type="button" className="ib" aria-label="Quitar imagen" onClick={() => setImage(null)}>{I(X, 18)}</button>}
              </div>
            </div>
            <label className="ff s6">{lab("Descripción")}<textarea className="ta" value={f.desc} onChange={e => set({ desc: e.target.value })} placeholder="Descripción adicional (opcional)" /></label>
          </div>
        )}
      </div>
    </div>
  )
}
