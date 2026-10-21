import { CircleAlert, Image, Info, Trash2, TriangleAlert, Upload, Video, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { createBannerCarrusel, getApiErrorMessage, updateBannerCarrusel } from "../../../services/marketingService"
import { TIMES, I } from "../shared"
import { BannerFields, type Meta } from "./BannerFields"
import { DropArea, FileAlert, PickFile } from "./DropArea"
import { SafePreview } from "./SafePreview"
import { TARGET_KB, fileProblem, kb, type Row } from "./bannerShared"
import type { BannersApi } from "./useBanners"

const nextOrden = (rows: Row[]) => String(Math.min(9999, rows.reduce((m, b) => Math.max(m, b.orden ?? 0), 0) + 1))

export function BannerPanel({ banner, api, onClose, onDelete }: { banner: Row | null; api: BannersApi; onClose: () => void; onDelete: (b: Row) => void }) {
  const edit = !!banner
  const [file, setFile] = useState<File | null>(null)
  const [problem, setProblem] = useState<{ name: string; msg: string } | null>(null)
  const [meta, setMeta] = useState<Meta>(() => banner
    ? { titulo: banner.titulo || "", orden: String(banner.orden ?? 0), activo: banner.activo !== false }
    : { titulo: "", orden: nextOrden(api.banners), activo: true })
  const [safe, setSafe] = useState(true)
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [apiErr, setApiErr] = useState("")

  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  const pick = (f: File) => {
    const msg = fileProblem(f)
    setApiErr("")
    if (msg) { setProblem({ name: f.name, msg }); return }
    setProblem(null); setDims(null); setFile(f)
  }
  const src = url || banner?.imagen_url || ""
  const isVideo = file ? file.type.startsWith("video/") : banner?.media_type === "video"
  const hasMedia = !!file || edit
  const n = Number(meta.orden)
  const ordenOk = meta.orden.trim() !== "" && Number.isInteger(n) && n >= 0 && n <= 9999
  const why = problem ? `Elige otro archivo: ${problem.name} no es válido.` : !hasMedia ? "Elige una imagen o un video para poder subir." : !ordenOk ? "El orden debe ser un número entero entre 0 y 9999." : ""
  const can = !why && !busy
  const ratio = dims ? dims.w / dims.h : 0
  const is169 = dims ? Math.abs(ratio - 16 / 9) < 0.03 : false

  const submit = async () => {
    if (!can) return
    setBusy(true); setApiErr("")
    try {
      const data = { imagen: file || undefined, titulo: meta.titulo.trim(), orden: n, activo: meta.activo }
      if (banner) await updateBannerCarrusel(banner.id_banner, data)
      else await createBannerCarrusel(data)
      await api.refresh()
      toast.success(edit ? "Banner actualizado exitosamente" : "Banner creado exitosamente")
      onClose()
    } catch (e) { setApiErr(getApiErrorMessage(e, edit ? "Error al actualizar el banner" : "Error al crear el banner")) }
    finally { setBusy(false) }
  }

  return (
    <aside className="pn" aria-labelledby="pn-t">
      <div className="pn-h"><h2 id="pn-t">{edit ? "Editar banner" : "Subir banner"}</h2><button type="button" className="ib" aria-label="Cerrar panel" disabled={busy} onClick={onClose}>{I(X, 20)}</button></div>
      <div className="pn-b">
        {!file && !edit && <DropArea onFile={pick} problem={problem?.msg || null} fileName={problem?.name} />}
        {hasMedia && (
          <div className="mediaBox">
            <div className="fi">
              {I(isVideo ? Video : Image, 18)}
              <b>{file ? file.name : `Archivo actual · ${isVideo ? "Video" : "Imagen"}`}</b>
              {file && dims && <span className="mut">{dims.w} {TIMES} {dims.h}</span>}
              <span className="sp" />
              {file && dims && !isVideo && (is169 ? <span className="st ok">{I(Info, 16)}16:9</span> : <span className="st warn">{I(TriangleAlert, 16)}No es 16:9</span>)}
              {file ? <button type="button" className="btn out sq" aria-label="Quitar archivo" onClick={() => { setFile(null); setDims(null); setProblem(null) }}>{I(X, 18)}</button> : <PickFile onFile={pick} label="Reemplazar archivo" />}
            </div>
            {src && <SafePreview key={src} src={src} video={!!isVideo} safe={safe} onSafe={setSafe} onDims={(w, h) => setDims({ w, h })} />}
            {file && !isVideo && file.size > TARGET_KB * 1024 && (
              <div className="al warn" role="status"><TriangleAlert className="ic" size={18} strokeWidth={1.75} aria-hidden="true" />
                <div><b>{kb(file.size)}: supera los {TARGET_KB} KB recomendados</b><p>Se puede subir (el límite es 8 MB), pero el hero tardará más en cargar. Comprime la imagen si puedes.</p></div></div>
            )}
            {edit && problem && <FileAlert problem={problem.msg} fileName={problem.name} />}
          </div>
        )}
        <BannerFields meta={meta} onMeta={setMeta} edit={edit} ordenOk={ordenOk} />
        {apiErr && <div className="al bad" role="alert"><CircleAlert className="ic" size={18} strokeWidth={1.75} aria-hidden="true" /><div><b>No se pudo guardar el banner</b><p>{apiErr}</p></div></div>}
      </div>
      <div className="pn-f">
        {why && <span className="why" id="why" style={problem ? { color: "hsl(var(--destructive-text))", fontWeight: 600 } : undefined}>{I(Info, 16)}<span>{why}</span></span>}
        {banner && <button type="button" className="btn out push" disabled={busy} onClick={() => onDelete(banner)}>{I(Trash2, 16)}Eliminar banner</button>}
        <button type="button" className="btn out" disabled={busy} onClick={onClose}>Cancelar</button>
        <button type="button" className="btn" aria-disabled={!can} aria-describedby={why ? "why" : undefined} onClick={() => void submit()}>
          {busy ? "Guardando…" : edit ? "Guardar cambios" : <>{I(Upload, 16)}Subir banner</>}
        </button>
      </div>
    </aside>
  )
}
