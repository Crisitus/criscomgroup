import { EyeOff } from "lucide-react"
import { I } from "../shared"
import { BannerThumb } from "./BannerThumb"
import { bannerOn, bannerTitle, type Row } from "./bannerShared"

export function CarouselPreview({ banners }: { banners: Row[] }) {
  const shown = banners.filter(bannerOn), off = banners.filter(b => !bannerOn(b))
  return (
    <section className="card" aria-label="Vista previa del carrusel">
      <div className="lc-h"><b>Vista previa del carrusel</b><span className="mut">Orden en que salen en el hero de la web</span></div>
      <div className="cs">
        {shown.length ? shown.map((b, i) => (
          <figure key={b.id_banner}><BannerThumb b={b} width={200} /><figcaption><b>{i + 1}</b><span>{b.media_type === "video" ? "Video" : "Imagen"}</span></figcaption></figure>
        )) : <span className="mut">Ningún banner publicado.</span>}
      </div>
      {off.map(b => <div className="live" key={b.id_banner}>{I(EyeOff, 16)}<span>No sale en la web (oculto): {bannerTitle(b)}</span></div>)}
    </section>
  )
}
