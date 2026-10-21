import { CircleAlert, Image, Loader, RotateCcw, Upload } from "lucide-react"
import { I } from "../shared"
import { BannerList } from "./BannerList"
import { CarouselPreview } from "./CarouselPreview"
import type { Row } from "./bannerShared"
import type { BannersApi } from "./useBanners"

export function BannersBody({ api, onNew, onEdit, onDelete, onPreview }: { api: BannersApi; onNew: () => void; onEdit: (b: Row) => void; onDelete: (b: Row) => void; onPreview: (b: Row) => void }) {
  if (api.loading) return (
    <section className="card" aria-busy="true">
      <div className="lc-h"><span className="st neu" role="status">{I(Loader, 16)}Cargando banners…</span></div>
      {[0, 1, 2, 3].map(i => <div className="br sk" key={i}><span className="skl" style={{ width: "70%" }} /><span className="skl" style={{ width: "35%" }} /></div>)}
    </section>
  )
  if (api.error) return (
    <section className="card"><div className="empty" role="alert">
      <div className="dic bad">{I(CircleAlert, 22)}</div>
      <h2>No se pudieron cargar los banners</h2>
      <p>No pudimos leer la lista de banners. Tu carrusel en la web no cambió. Vuelve a intentarlo.</p>
      <button type="button" className="btn rp" onClick={api.refetch}>{I(RotateCcw, 16)}Reintentar</button>
    </div></section>
  )
  if (!api.banners.length) return (
    <section className="card"><div className="empty">
      <div className="dic">{I(Image, 22)}</div>
      <h2>Aún no hay banners</h2>
      <p>Sin banners publicados, el carrusel del hero de la web no tiene qué mostrar. Sube una imagen (JPG, PNG, WebP, AVIF) o un video (MP4, WebM).</p>
      <button type="button" className="btn rp" onClick={onNew}>{I(Upload, 16)}Subir el primer banner</button>
    </div></section>
  )
  return <><BannerList api={api} onEdit={onEdit} onDelete={onDelete} onPreview={onPreview} /><CarouselPreview banners={api.banners} /></>
}
