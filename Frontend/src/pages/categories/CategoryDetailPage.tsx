import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type React from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Clock, ImageIcon, Loader2, Lock, RotateCcw, Save, Tags, Trash2, TriangleAlert, Upload, X,
  type LucideIcon,
} from "lucide-react"
import {
  deleteCategory, deleteCategoryImage, fetchCategoryById, updateCategory, updateCategoryWithImage, type CategoryProduct,
} from "../../services/categoryService"
import { ErpDialog } from "../../components/erp/ErpDialog"
import { money } from "../../components/erp/format"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { useBusinessHours } from "../../hooks/useBusinessHours"
import { useAuth } from "../../contexts/AuthContext"
import "../../styles/categorias.css"

const I = (Icon: LucideIcon, size = 16, cls = "") => <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />
const apiMsg = (e: unknown, fallback: string) => (e as { response?: { data?: { message?: string } } }).response?.data?.message || (e as Error)?.message || fallback
const nProd = (n: number) => `${n} ${n === 1 ? "producto" : "productos"}`
const nUni = (n: number) => `${n} ${n === 1 ? "unidad" : "unidades"}`
const whyDel = (n: number) => `La categoría tiene ${nProd(n)}. ${n === 1 ? "Muévelo" : "Muévelos"} a otra categoría antes de eliminarla.`
const NOHORA = "Fuera de tu horario laboral: tu rol solo puede modificar categorías dentro de él. Puedes consultarlas."
const IMG_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
const imageError = (f: File) =>
  !IMG_TYPES.includes(f.type) ? "Tipo de archivo no válido. Solo JPG, PNG o WebP." : f.size > 5 * 1024 * 1024 ? "La imagen supera 5 MB. Elige una más liviana." : null
/** `2026-10-09 13:23:43` (ya en hora de Lima: el backend escribe con -05:00) -> `09/10/2026 · 1:23 p. m.` */
const fdate = (ts?: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(ts || "")
  if (!m) return "—"
  const h = Number(m[4])
  return `${m[3]}/${m[2]}/${m[1]} · ${h % 12 || 12}:${m[5]} ${h >= 12 ? "p. m." : "a. m."}`
}
const num = (v: string | null) => Number(v || 0)

const Stock = ({ p }: { p: CategoryProduct }) => (p.stock > 0 ? <span className="num">{p.stock}</span> : <span className="st bad">{I(CircleAlert, 14)}Sin stock</span>)
const Oferta = ({ p }: { p: CategoryProduct }) => (p.es_oferta && p.precio_oferta_con_igv ? <span className="num">{money(num(p.precio_oferta_con_igv))}</span> : <span className="mut" aria-label="Sin oferta">—</span>)
const Mayor = ({ p }: { p: CategoryProduct }) => (p.precio_mayoritario_con_igv ? <span className="num">{money(num(p.precio_mayoritario_con_igv))}</span> : <span className="mut" aria-label="Sin precio mayorista">—</span>)

export default function CategoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const cid = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()
  const { isWithinBusinessHours } = useBusinessHours()
  const ro = user?.id_role === 3 && !isWithinBusinessHours && !user?.superusuario_temporal && !user?.area_grants?.includes("inventario")

  const host = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1120)
  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const r = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)))
    r.observe(el)
    return () => r.disconnect()
  }, [])
  const mob = width < 640
  const lap = width < 1100

  const { data: cat, isLoading, isError, error, refetch } = useQuery({ queryKey: ["category", id], queryFn: () => fetchCategoryById(cid), retry: false })
  useDocumentTitle(cat?.nombre ? `Categoría ${cat.nombre}` : "Categoría")

  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [deleteImage, setDeleteImage] = useState(false)
  const [nameErr, setNameErr] = useState("")
  const [imgErr, setImgErr] = useState("")
  const [delOpen, setDelOpen] = useState(false)
  const [delErr, setDelErr] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!cat) return
    setNombre(cat.nombre)
    setDescripcion(cat.descripcion || "")
  }, [cat])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const prods = useMemo(() => cat?.productos || [], [cat])
  const units = prods.reduce((a, p) => a + Number(p.stock || 0), 0)
  const dirty = !!cat && (nombre !== cat.nombre || descripcion !== (cat.descripcion || "") || !!file || deleteImage)

  const resetImage = () => { setFile(null); setPreview(null); setDeleteImage(false); setImgErr("") }

  const saveMut = useMutation({
    mutationFn: async () => {
      const data = { nombre: nombre.trim(), descripcion: descripcion.trim() }
      // Solo se borra en el servidor si la categoría realmente tenía imagen (si no, el backend responde 400 y aborta)
      if (deleteImage && cat?.imagen_url && !file) await deleteCategoryImage(cid)
      if (file) {
        const fd = new FormData()
        fd.append("nombre", data.nombre)
        fd.append("descripcion", data.descripcion)
        fd.append("imagen_categoria", file)
        return updateCategoryWithImage(cid, fd)
      }
      return updateCategory(cid, data)
    },
    onSuccess: () => {
      toast.success("Categoría guardada")
      resetImage()
      qc.invalidateQueries({ queryKey: ["categories"] })
      qc.invalidateQueries({ queryKey: ["category", id] })
    },
    onError: e => {
      const status = (e as { response?: { status?: number } }).response?.status
      const msg = apiMsg(e, "No se pudo guardar la categoría")
      if (status === 409) setNameErr(msg)
      else toast.error(msg)
      qc.invalidateQueries({ queryKey: ["category", id] })
    },
  })

  const delMut = useMutation({
    mutationFn: () => deleteCategory(cid),
    onSuccess: () => {
      toast.success(`Categoría «${cat?.nombre}» eliminada`)
      qc.invalidateQueries({ queryKey: ["categories"] })
      navigate("/categories")
    },
    onError: e => { setDelErr(apiMsg(e, "No se pudo eliminar la categoría")); qc.invalidateQueries({ queryKey: ["category", id] }) },
  })

  const save = () => {
    if (!dirty || ro || saveMut.isPending) return
    if (!nombre.trim()) { setNameErr("Escribe el nombre de la categoría."); return }
    saveMut.mutate()
  }
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    const err = imageError(f)
    if (err) { setImgErr(err); return }
    setImgErr("")
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setDeleteImage(false)
  }

  const back = mob
    ? <Link className="ib bd" to="/categories" aria-label="Volver a Categorías">{I(ChevronLeft, 20)}</Link>
    : <Link className="btn out" to="/categories">{I(ChevronLeft)}Categorías</Link>

  if (isLoading || isError || !cat) {
    const notFound = (error as { response?: { status?: number } } | null)?.response?.status === 404
    return (
      <div className="pg-categorias" ref={host}>
        <div className="pg">
          <div className="hd"><h1>{isLoading ? "Categoría" : notFound ? "Categoría no encontrada" : "Categoría"}</h1><div className="hr">{back}</div></div>
          {isLoading
            ? <div className="card" role="status" aria-busy="true"><div className="empty"><span className="ei">{I(Loader2, 22, "spin")}</span><h2>Cargando categoría…</h2></div></div>
            : (
              <div className="card" role="alert"><div className="empty"><span className="ei bad">{I(CircleAlert, 22)}</span>
                <h2>{notFound ? "Esta categoría no existe o fue eliminada" : "No se pudo cargar la categoría"}</h2>
                <p>{notFound ? "Vuelve a la lista de categorías." : apiMsg(error, "Revisa tu conexión e inténtalo de nuevo.")}</p>
                {notFound ? <Link className="btn out" to="/categories">{I(ChevronLeft)}Ir a Categorías</Link> : <button type="button" className="btn out" onClick={() => void refetch()}>Reintentar</button>}
              </div></div>
            )}
        </div>
      </div>
    )
  }

  const stat = dirty
    ? <span className="st warn">{I(TriangleAlert, 14)}Cambios sin guardar</span>
    : <span className="st neu" id="why-save">{I(CircleCheck, 14)}Sin cambios</span>
  const saveBtn = (
    <button type="button" className="btn" aria-disabled={!dirty || ro || saveMut.isPending} aria-describedby={ro ? "why-ro" : dirty ? undefined : "why-save"} onClick={save}>
      {saveMut.isPending ? I(Loader2, 16, "spin") : I(Save)}Guardar
    </button>
  )

  // Imagen: nueva (sin guardar) · actual · marcada para quitar · ninguna
  const hasCurrent = !!cat.imagen_url && !deleteImage
  const imgBlock = file && preview ? (
    <>
      <span className="th lg" role="img" aria-label="Vista previa de la imagen nueva"><img src={preview} alt="" /></span>
      <div className="col"><span className="st warn">{I(TriangleAlert, 14)}Imagen nueva, sin guardar</span>
        <div className="bt">
          <button type="button" className="btn out sm" disabled={ro} onClick={() => fileRef.current?.click()}>{I(Upload)}Cambiar</button>
          <button type="button" className="btn out sm" onClick={resetImage}>{I(X)}Quitar</button>
        </div></div>
    </>
  ) : hasCurrent ? (
    <>
      <span className="th lg"><img src={cat.imagen_url!} alt={`Imagen de ${cat.nombre}`} /></span>
      <div className="col">
        <div className="bt">
          <button type="button" className="btn out sm" disabled={ro} onClick={() => fileRef.current?.click()}>{I(Upload)}Cambiar</button>
          <button type="button" className="btn out sm" disabled={ro} onClick={() => setDeleteImage(true)}>{I(X)}Quitar</button>
        </div>
        <span className="hint">JPG, PNG o WebP · máx. 5 MB</span></div>
    </>
  ) : (
    <>
      <span className="th lg" role="img" aria-label="Sin imagen">{I(ImageIcon, 28)}</span>
      <div className="col">
        {deleteImage && <span className="st warn">{I(TriangleAlert, 14)}Se quitará al guardar</span>}
        <div className="bt">
          <button type="button" className="btn out sm" disabled={ro} onClick={() => fileRef.current?.click()}>{I(Upload)}Subir imagen</button>
          {deleteImage && <button type="button" className="btn out sm" onClick={() => setDeleteImage(false)}>{I(RotateCcw)}Deshacer</button>}
        </div>
        {!deleteImage && <span className="hint">JPG, PNG o WebP · máx. 5 MB</span>}</div>
    </>
  )

  const n = prods.length
  const delBlocked = n > 0 || ro
  const delZone = delBlocked ? (
    <>
      <button type="button" className="btn out" aria-disabled="true" aria-describedby="why-del">{I(Lock)}Eliminar categoría</button>
      <p className="hint" id="why-del">{I(Lock, 14)}<span>{ro ? NOHORA : whyDel(n)}</span></p>
    </>
  ) : (
    <>
      <button type="button" className="btn out" aria-describedby="why-del" onClick={() => { setDelErr(""); setDelOpen(true) }}>{I(Trash2)}Eliminar categoría</button>
      <p className="hint" id="why-del">{I(CircleCheck, 14)}<span>No tiene productos: se puede eliminar.</span></p>
    </>
  )

  const datos = (
    <section className="card">
      <div className="ch"><h2>Datos</h2></div>
      <form className="cb" onSubmit={e => { e.preventDefault(); save() }} noValidate>
        <div className="fl"><label htmlFor="c-nom">Nombre</label>
          <div className={`fld${nameErr ? " bad" : ""}`}><input id="c-nom" value={nombre} autoComplete="off" readOnly={ro} aria-invalid={!!nameErr}
            aria-describedby={nameErr ? "c-nom-err" : undefined} onChange={e => { setNombre(e.target.value); setNameErr("") }} /></div>
          {nameErr && <p className="err" id="c-nom-err" role="alert">{I(CircleAlert)}<span>{nameErr}</span></p>}
        </div>
        <div className="fl"><label htmlFor="c-des">Descripción</label>
          <div className="fld ta"><textarea id="c-des" value={descripcion} readOnly={ro} placeholder="Descripción de la categoría" onChange={e => setDescripcion(e.target.value)} /></div></div>
        <div className="fl"><span className="lb">Imagen</span><div className="imgrow">{imgBlock}</div>
          <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={pick} />
          {imgErr && <p className="err" role="alert">{I(CircleAlert)}<span>{imgErr}</span></p>}
        </div>
        <dl className="dl"><div><dt>Creada</dt><dd className="num">{fdate(cat.creado_en)}</dd></div><div><dt>Actualizada</dt><dd className="num">{fdate(cat.actualizado_en)}</dd></div></dl>
      </form>
      <div className="zone"><span className="zt">Eliminar</span>{delZone}</div>
    </section>
  )

  const go = (p: CategoryProduct) => navigate(`/products/${p.id_producto}`)
  const prodHeadInner = <><h2>Productos</h2><span className="sub">{nProd(n)} · {nUni(units)} · {mob ? "con IGV" : "precios con IGV"}</span></>
  const prodHead = <div className="ch">{prodHeadInner}</div>
  const cols = lap ? [108, 0, 76, 76, 82, 98, 52] : [128, 0, 92, 92, 96, 112, 52]
  const productos = !n ? (
    <section className="card">{prodHead}
      <div className="empty" style={{ padding: "40px 16px" }}><span className="ei">{I(Tags, 22)}</span><h2>Esta categoría no tiene productos</h2>
        <p>Cuando un producto se asigne a «{cat.nombre}», aparecerá aquí.</p></div></section>
  ) : mob ? (
    <section><div className="ch box">{prodHeadInner}</div>
      <div className="mlist">{prods.map(p => (
        <Link className="mc pc" key={p.id_producto} to={`/products/${p.id_producto}`} aria-label={`Abrir producto ${p.nombre}`}>
          <div className="m1"><div className="stk"><span className="nm pn">{p.nombre}</span><span className="sku">{p.sku}</span></div><span className="go">{I(ChevronRight, 18)}</span></div>
          <dl className="m5"><div><dt>Precio</dt><dd className="num">{money(num(p.precio_unitario_con_igv))}</dd></div><div><dt>Oferta</dt><dd><Oferta p={p} /></dd></div>
            <div><dt>Mayorista</dt><dd><Mayor p={p} /></dd></div><div><dt>Stock</dt><dd><Stock p={p} /></dd></div></dl>
        </Link>
      ))}</div></section>
  ) : (
    <section className="card">{prodHead}
      <table className="tb pt"><colgroup>{cols.map((w, i) => <col key={i} style={w ? { width: w } : undefined} />)}</colgroup>
        <thead><tr><th>SKU</th><th>Nombre</th><th className="r">Precio</th><th className="r">Oferta</th><th className="r">Mayorista</th><th className="r">Stock</th><th><span className="sr">Abrir</span></th></tr></thead>
        <tbody>{prods.map(p => (
          <tr className="rw" key={p.id_producto} onClick={() => go(p)}>
            <td><span className="sku">{p.sku}</span></td>
            <td><div className="stk"><span className="nm pn">{p.nombre}</span></div></td>
            <td className="r pr num">{money(num(p.precio_unitario_con_igv))}</td>
            <td className="r pr"><Oferta p={p} /></td><td className="r pr"><Mayor p={p} /></td><td className="r pr"><Stock p={p} /></td>
            <td className="r"><Link className="ib" to={`/products/${p.id_producto}`} aria-label={`Abrir producto ${p.nombre}`} onClick={e => e.stopPropagation()}>{I(ChevronRight, 18)}</Link></td>
          </tr>
        ))}</tbody>
      </table>
    </section>
  )

  return (
    <div className="pg-categorias" ref={host}>
      <div className="pg">
        <div className="hd"><h1>{cat.nombre}</h1><div className="hr">{!mob && stat}{back}{saveBtn}</div></div>
        {mob && <div>{stat}</div>}
        {ro && <p className="ctx" id="why-ro">{I(Clock)}<span>{NOHORA}</span></p>}
        <div className="det">{datos}{productos}</div>
      </div>

      {delOpen && (
        <ErpDialog open onOpenChange={o => { if (!o && !delMut.isPending) setDelOpen(false) }} title={`¿Eliminar la categoría «${cat.nombre}»?`} icon={I(Trash2, 22)} tone="bad">
          <div className="pg-categorias dlgw"><div className="dlg">
            <p>Se elimina de forma permanente del inventario y de la tienda web. No tiene productos, así que ningún producto cambia. <b>Esta acción no se puede deshacer.</b></p>
            {delErr && <p className="err" role="alert">{I(CircleAlert)}<span>{delErr}</span></p>}
            <div className="acts">
              <button type="button" className="btn out" onClick={() => setDelOpen(false)} disabled={delMut.isPending}>{delErr ? "Cerrar" : "Cancelar"}</button>
              {!delErr && <button type="button" className="btn dng" aria-disabled={delMut.isPending} onClick={() => { if (!delMut.isPending) delMut.mutate() }}>
                {delMut.isPending ? I(Loader2, 16, "spin") : I(Trash2)}Eliminar categoría</button>}
            </div>
          </div></div>
        </ErpDialog>
      )}
    </div>
  )
}
