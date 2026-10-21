import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type React from "react"
import { Link, useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ChevronDown, ChevronRight, CircleAlert, CircleCheck, Clock, ImageIcon, Loader2, Lock, Plus, Search, Tags, Trash2, Upload, X,
  type LucideIcon,
} from "lucide-react"
import { createCategory, createCategoryWithImage, deleteCategory, fetchCategories, type Category } from "../../services/categoryService"
import { ErpDialog } from "../../components/erp/ErpDialog"
import { norm } from "../../components/erp/format"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { useBusinessHours } from "../../hooks/useBusinessHours"
import { useAuth } from "../../contexts/AuthContext"
import "../../styles/categorias.css"

const I = (Icon: LucideIcon, size = 16, cls = "") => <Icon className={`ic${cls ? ` ${cls}` : ""}`} size={size} strokeWidth={1.75} aria-hidden="true" />
const apiMsg = (e: unknown, fallback: string) => (e as { response?: { data?: { message?: string } } }).response?.data?.message || (e as Error)?.message || fallback
const nProd = (n: number) => `${n} ${n === 1 ? "producto" : "productos"}`
const whyDel = (n: number) => `La categoría tiene ${nProd(n)}. ${n === 1 ? "Muévelo" : "Muévelos"} a otra categoría antes de eliminarla.`
const NOHORA = "Fuera de tu horario laboral: tu rol solo puede modificar categorías dentro de él. Puedes consultarlas."
const IMG_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
const IMG_MAX = 5 * 1024 * 1024
/** Valida la imagen de categoría (jpg/png/webp ≤ 5 MB). Devuelve el error o null. */
const imageError = (f: File) =>
  !IMG_TYPES.includes(f.type) ? "Tipo de archivo no válido. Solo JPG, PNG o WebP." : f.size > IMG_MAX ? "La imagen supera 5 MB. Elige una más liviana." : null

type Filtro = "todas" | "con" | "vac"
type Orden = "nombre" | "productos" | "unidades"
const np = (c: Category) => Number(c.total_productos || 0)
const nu = (c: Category) => Number(c.total_unidades || 0)

function Thumb({ c, lg = false }: { c?: Category | null; lg?: boolean }) {
  if (c?.imagen_url) return <span className={`th${lg ? " lg" : ""}`}><img src={c.imagen_url} alt={`Imagen de ${c.nombre}`} /></span>
  return <span className={`th${lg ? " lg" : ""}`} role="img" aria-label={c ? `Sin imagen: ${c.nombre}` : "Sin imagen"}>{I(ImageIcon, lg ? 28 : 18)}</span>
}

export default function CategoriesPage() {
  useDocumentTitle("Categorías")
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

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories })
  const cats = useMemo(() => data || [], [data])
  const [query, setQuery] = useState("")
  const [filtro, setFiltro] = useState<Filtro>("todas")
  const [orden, setOrden] = useState<Orden>("nombre")
  const [whyOpen, setWhyOpen] = useState<number | null>(null)
  const [del, setDel] = useState<Category | null>(null)
  const [delErr, setDelErr] = useState("")
  const [nuevo, setNuevo] = useState(false)

  useEffect(() => {
    if (whyOpen === null) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !(e.target as HTMLElement).closest?.("[data-why]")) setWhyOpen(null)
    }
    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", close)
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close) }
  }, [whyOpen])

  const tot = useMemo(() => ({
    cats: cats.length,
    prod: cats.reduce((a, c) => a + np(c), 0),
    uni: cats.reduce((a, c) => a + nu(c), 0),
    con: cats.filter(c => np(c) > 0).length,
    vac: cats.filter(c => np(c) === 0).length,
  }), [cats])

  const list = useMemo(() => {
    const q = norm(query.trim())
    return cats
      .filter(c => (filtro === "todas" || (filtro === "con" ? np(c) > 0 : np(c) === 0)) && (!q || norm(`${c.nombre} ${c.descripcion || ""}`).includes(q)))
      .sort((a, b) =>
        orden === "productos" ? np(b) - np(a) || a.nombre.localeCompare(b.nombre, "es")
          : orden === "unidades" ? nu(b) - nu(a) || a.nombre.localeCompare(b.nombre, "es")
            : a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }))
  }, [cats, query, filtro, orden])

  const delMut = useMutation({
    mutationFn: (c: Category) => deleteCategory(c.id_categoria),
    onSuccess: (_d, c) => {
      toast.success(`Categoría «${c.nombre}» eliminada`)
      setDel(null)
      qc.invalidateQueries({ queryKey: ["categories"] })
    },
    onError: e => {
      // El backend responde 409 con el motivo exacto (p. ej. tiene productos): se muestra una sola vez, en el diálogo.
      setDelErr(apiMsg(e, "No se pudo eliminar la categoría"))
      qc.invalidateQueries({ queryKey: ["categories"] })
    },
  })

  const delBtn = (c: Category, inCard: boolean) => {
    const n = np(c)
    const blocked = n > 0 || ro
    const label = `Eliminar categoría ${c.nombre}`
    if (!blocked) return <button type="button" className="ib bd" aria-label={label} onClick={e => { e.stopPropagation(); setDelErr(""); setDel(c) }}>{I(Trash2, 18)}</button>
    const id = `why-${c.id_categoria}`
    return (
      <>
        <button type="button" className="ib bd" aria-disabled="true" aria-label={label} aria-describedby={id} data-why=""
          onClick={e => { e.stopPropagation(); if (!inCard) setWhyOpen(c.id_categoria) }}
          onFocus={() => { if (!inCard) setWhyOpen(c.id_categoria) }} onBlur={() => setWhyOpen(null)}>{I(Trash2, 18)}</button>
        {!inCard && <span className={`why${whyOpen === c.id_categoria ? " on" : ""}`} id={id} role="tooltip">{I(Lock)}<span>{ro ? NOHORA : whyDel(n)}</span></span>}
      </>
    )
  }

  const newBtn = ro
    ? <button type="button" className="btn" aria-disabled="true" aria-describedby="why-new">{I(Plus)}Nueva categoría</button>
    : <button type="button" className="btn" onClick={() => setNuevo(true)}>{I(Plus)}Nueva categoría</button>

  const chip = (k: Filtro, t: string, n: number) => (
    <button type="button" className="chp" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{t}<span className="n">{n}</span></button>
  )
  const fbar = (
    <div className="fbar">
      <label className="fld q">{I(Search)}<input type="search" placeholder="Buscar categoría" aria-label="Buscar categoría" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <div className="chips" role="group" aria-label="Filtrar categorías">
        {chip("todas", "Todas", tot.cats)}{chip("con", "Con productos", tot.con)}{chip("vac", "Vacías", tot.vac)}
      </div>
      <span className="sel" style={{ width: mob ? 150 : 176 }}>
        <select aria-label="Ordenar por" value={orden} onChange={e => setOrden(e.target.value as Orden)}>
          <option value="nombre">Nombre (A–Z)</option><option value="productos">Más productos</option><option value="unidades">Más unidades</option>
        </select>{I(ChevronDown)}
      </span>
    </div>
  )
  const totals = <span><b className="num">{tot.cats}</b> categorías · <b className="num">{tot.prod}</b> productos · <b className="num">{tot.uni}</b> unidades</span>
  const cols = lap ? [56, 0, 150, 84, 156] : [64, 0, 168, 100, 172]
  const colgroup = <colgroup>{cols.map((w, i) => <col key={i} style={w ? { width: w } : undefined} />)}</colgroup>
  const thead = (
    <thead><tr><th><span className="sr">Imagen</span></th><th>Nombre</th><th className="r">Productos</th><th className="r">Unidades</th><th className="r"><span className="sr">Acciones</span></th></tr></thead>
  )
  const open = (c: Category) => navigate(`/categories/${c.id_categoria}`)

  const table = (
    <div className="tcard">
      <table className="tb">{colgroup}{thead}
        <tbody>
          {list.map(c => (
            <tr className="rw" key={c.id_categoria} onClick={() => open(c)}>
              <td><Thumb c={c} /></td>
              <td><div className="stk"><span className="nm">{c.nombre}</span>{c.descripcion && <span className="sub">{c.descripcion}</span>}</div></td>
              <td className="r"><div className="stk rt"><b className="num">{np(c)}</b>
                {np(c) > 0 ? <span className="sub lk nw">{I(Lock, 12)}No se puede eliminar</span> : <span className="st neu">{I(CircleCheck, 14)}Vacía</span>}</div></td>
              <td className="r num"><b className="u">{nu(c)}</b></td>
              <td><div className="ac">
                <Link className="btn out sm" to={`/categories/${c.id_categoria}`} aria-label={`Abrir ${c.nombre}`} onClick={e => e.stopPropagation()}>Abrir{I(ChevronRight)}</Link>
                {delBtn(c, false)}
              </div></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="tf">{totals}</div>
    </div>
  )
  const cards = (
    <>
      <div className="mlist">
        {list.map(c => {
          const blocked = np(c) > 0
          const rs = ro ? NOHORA : blocked ? whyDel(np(c)) : ""
          return (
            <article className="mc" key={c.id_categoria}>
              <div className="m1"><Thumb c={c} /><div className="stk"><span className="nm">{c.nombre}</span>{c.descripcion && <span className="sub">{c.descripcion}</span>}</div></div>
              <div className="m2"><span><b className="num">{np(c)}</b> {np(c) === 1 ? "producto" : "productos"} · <b className="num">{nu(c)}</b> {nu(c) === 1 ? "unidad" : "unidades"}</span>
                {!blocked && <span className="st neu">{I(CircleCheck, 14)}Vacía</span>}</div>
              <div className="m4"><Link className="btn out" to={`/categories/${c.id_categoria}`} aria-label={`Abrir ${c.nombre}`}>Abrir{I(ChevronRight)}</Link>{delBtn(c, true)}</div>
              {rs && <p className="rs" id={`why-${c.id_categoria}`}>{I(Lock)}<span>{rs}</span></p>}
            </article>
          )
        })}
      </div>
      <p className="ctx" style={{ justifyContent: "center" }}>{totals}</p>
    </>
  )
  const bar = (w: number, h = 12) => <span className="skb" style={{ width: w, height: h }} />
  const skeleton = mob
    ? <div className="mlist" aria-busy="true">{[0, 1, 2, 3].map(i => <div className="mc" key={i}><div className="m1"><span className="th" /><div className="stk" style={{ gap: 8 }}>{bar(160, 14)}{bar(110, 11)}</div></div>{bar(200)}</div>)}</div>
    : (
      <div className="tcard" aria-busy="true" role="status"><span className="sr">Cargando categorías…</span>
        <table className="tb skl">{colgroup}{thead}
          <tbody>{[0, 1, 2, 3, 4].map(i => (
            <tr key={i}><td><span className="th" /></td><td><div className="stk" style={{ gap: 6 }}>{bar(180 - i * 14, 14)}{bar(120, 11)}</div></td>
              <td className="r"><div className="stk rt">{bar(24, 14)}</div></td><td className="r"><div className="stk rt">{bar(28, 14)}</div></td><td><div className="ac">{bar(72, 32)}</div></td></tr>
          ))}</tbody>
        </table>
      </div>
    )

  let body: React.ReactNode
  if (isLoading) body = <>{fbar}{skeleton}</>
  else if (isError) body = (
    <div className="tcard" role="alert"><div className="empty"><span className="ei bad">{I(CircleAlert, 22)}</span><h2>No se pudieron cargar las categorías</h2>
      <p>Revisa tu conexión e inténtalo de nuevo.</p><button type="button" className="btn out" onClick={() => void refetch()}>Reintentar</button></div></div>
  )
  else if (!cats.length) body = (
    <div className="tcard"><div className="empty"><span className="ei">{I(Tags, 22)}</span><h2>Aún no hay categorías</h2><p>Crea la primera con «Nueva categoría».</p></div></div>
  )
  else if (!list.length) body = (
    <>{fbar}<div className="tcard"><div className="empty"><span className="ei">{I(Search, 22)}</span><h2>Ninguna categoría coincide</h2>
      <p>Prueba con otro nombre o quita el filtro.</p>
      <button type="button" className="btn out" onClick={() => { setQuery(""); setFiltro("todas") }}>Limpiar búsqueda</button></div></div></>
  )
  else body = <>{fbar}{mob ? cards : table}</>

  return (
    <div className="pg-categorias" ref={host}>
      <div className="pg">
        <div className="hd"><h1>Categorías</h1><div className="hr">{newBtn}</div></div>
        {ro && <p className="ctx" id="why-new">{I(Clock)}<span>{NOHORA}</span></p>}
        {body}
      </div>

      {nuevo && <NewCategoryDialog onClose={() => setNuevo(false)} onCreated={() => { setNuevo(false); qc.invalidateQueries({ queryKey: ["categories"] }) }} />}

      {del && (
        <ErpDialog open onOpenChange={o => { if (!o && !delMut.isPending) setDel(null) }} title={`¿Eliminar la categoría «${del.nombre}»?`} icon={I(Trash2, 22)} tone="bad">
          <div className="pg-categorias dlgw"><div className="dlg">
            <p>Se elimina de forma permanente del inventario y de la tienda web. No tiene productos, así que ningún producto cambia. <b>Esta acción no se puede deshacer.</b></p>
            {delErr && <p className="err" role="alert">{I(CircleAlert)}<span>{delErr}</span></p>}
            <div className="acts">
              <button type="button" className="btn out" onClick={() => setDel(null)} disabled={delMut.isPending}>{delErr ? "Cerrar" : "Cancelar"}</button>
              {!delErr && <button type="button" className="btn dng" aria-disabled={delMut.isPending} onClick={() => { if (!delMut.isPending) delMut.mutate(del) }}>
                {delMut.isPending ? I(Loader2, 16, "spin") : I(Trash2)}Eliminar categoría</button>}
            </div>
          </div></div>
        </ErpDialog>
      )}
    </div>
  )
}

function NewCategoryDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [nameErr, setNameErr] = useState("")
  const [imgErr, setImgErr] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const mut = useMutation({
    mutationFn: () => {
      const nom = nombre.trim(), des = descripcion.trim()
      if (file) {
        const fd = new FormData()
        fd.append("nombre", nom)
        if (des) fd.append("descripcion", des)
        fd.append("imagen_categoria", file)
        return createCategoryWithImage(fd)
      }
      return createCategory({ nombre: nom, ...(des ? { descripcion: des } : {}) })
    },
    onSuccess: c => { toast.success(`Categoría «${c?.nombre || nombre.trim()}» creada`); onCreated() },
    onError: e => {
      const status = (e as { response?: { status?: number } }).response?.status
      const msg = apiMsg(e, "No se pudo crear la categoría")
      if (status === 409 || status === 400) setNameErr(msg)
      else toast.error(msg)
    },
  })

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    const err = imageError(f)
    if (err) { setImgErr(err); return }
    setImgErr("")
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mut.isPending) return
    if (!nombre.trim()) { setNameErr("Escribe el nombre de la categoría."); return }
    mut.mutate()
  }

  return (
    <ErpDialog open onOpenChange={o => { if (!o && !mut.isPending) onClose() }} title="Nueva categoría">
      <form className="pg-categorias dlgw" onSubmit={submit} noValidate><div className="dlg">
        <div className="fl"><label htmlFor="dn-nom">Nombre <span className="opt">(obligatorio)</span></label>
          <div className={`fld${nameErr ? " bad" : ""}`}><input id="dn-nom" value={nombre} autoComplete="off" placeholder="Nombre de la categoría" autoFocus
            aria-invalid={!!nameErr} aria-describedby={nameErr ? "dn-err" : undefined} onChange={e => { setNombre(e.target.value); setNameErr("") }} /></div>
          {nameErr && <p className="err" id="dn-err" role="alert">{I(CircleAlert)}<span>{nameErr}</span></p>}
        </div>
        <div className="fl"><label htmlFor="dn-des">Descripción <span className="opt">(opcional)</span></label>
          <div className="fld ta"><textarea id="dn-des" placeholder="Descripción de la categoría" value={descripcion} onChange={e => setDescripcion(e.target.value)} /></div></div>
        <div className="fl"><span className="lb">Imagen <span className="opt">(opcional)</span></span>
          <div className="imgrow">
            {preview
              ? <span className="th lg" role="img" aria-label="Vista previa de la imagen"><img src={preview} alt="" /></span>
              : <Thumb lg />}
            <div className="col">
              <div className="bt">
                <button type="button" className="btn out sm" onClick={() => fileRef.current?.click()}>{I(Upload)}{file ? "Cambiar" : "Elegir imagen"}</button>
                {file && <button type="button" className="btn out sm" onClick={() => { setFile(null); setPreview(null) }}>{I(X)}Quitar</button>}
              </div>
              <span className="hint">JPG, PNG o WebP · máx. 5 MB</span>
            </div>
          </div>
          <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={pick} />
          {imgErr && <p className="err" role="alert">{I(CircleAlert)}<span>{imgErr}</span></p>}
        </div>
        <div className="acts">
          <button type="button" className="btn out" onClick={onClose} disabled={mut.isPending}>Cancelar</button>
          <button type="submit" className="btn" aria-disabled={mut.isPending}>{mut.isPending && I(Loader2, 16, "spin")}Crear categoría</button>
        </div>
      </div></form>
    </ErpDialog>
  )
}
