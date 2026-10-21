import { RefreshCw, Trash2, TriangleAlert } from "lucide-react"
import { ErpDialog } from "../../../components/erp/ErpDialog"
import type { BlogPost } from "../../../services/blogService"
import { Chip, I } from "./blogParts"
import { ELL, Q, SITE_HOST, dtF, estadoDe, trunc } from "./blogCommon"

export function DeleteDialog({ post, busy, onCancel, onConfirm }: { post: BlogPost; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const s = estadoDe(post)
  const url = `${SITE_HOST}/blog/${post.slug}`
  const audit = "Se elimina para siempre y queda registrado en la auditoría."
  return (
    <ErpDialog open onOpenChange={o => { if (!o && !busy) onCancel() }} title={`¿Eliminar ${Q(trunc(post.titulo, 70))}?`} icon={I(Trash2, 22)} tone="bad">
      <div className="pg-blog dlgw">
        <p className="dp">
          {s === "borrador" ? <>Es un borrador: no tiene dirección pública, así que no se rompe ningún enlace. {audit}</>
            : s === "publicado" ? <>{audit} La dirección pública <b>{url}</b> deja de existir: quien tenga ese enlace verá un error.</>
            : <>{audit} Estaba programada para el {post.publicado_en ? dtF(post.publicado_en) : ""}; esa salida se cancela.</>}{" "}
          <b>No se puede deshacer.</b>
        </p>
        <dl className="dl">
          <div><dt>Estado</dt><dd><Chip e={s} /></dd></div>
          <div><dt>{post.publicado_en ? (s === "publicado" ? "Publicada el" : s === "programado" ? "Sale el" : "Fecha guardada") : "Fecha de salida"}</dt><dd className="num">{post.publicado_en ? dtF(post.publicado_en) : "Sin fecha"}</dd></div>
        </dl>
        <div className="acts">
          <button type="button" className="btn out" onClick={onCancel} disabled={busy}>Cancelar</button>
          <button type="button" className="btn dng" onClick={onConfirm} disabled={busy}>{busy ? <>{I(RefreshCw, 16, "spin")}Eliminando{ELL}</> : <>{I(Trash2, 16)}Eliminar {s === "borrador" ? "borrador" : "publicación"}</>}</button>
        </div>
      </div>
    </ErpDialog>
  )
}

export function LeaveDialog({ changed, onLeave, onStay }: { changed: string; onLeave: () => void; onStay: () => void }) {
  return (
    <ErpDialog open onOpenChange={o => { if (!o) onStay() }} title="¿Salir sin guardar?" icon={<span className="warnic">{I(TriangleAlert, 22)}</span>}>
      <div className="pg-blog dlgw">
        <p className="dp">Cambiaste <b>{changed}</b>. Si sales ahora esos cambios se pierden; la publicación queda tal como se guardó por última vez.</p>
        <div className="acts">
          <button type="button" className="btn out" onClick={onLeave}>Salir sin guardar</button>
          <button type="button" className="btn" onClick={onStay}>Seguir editando</button>
        </div>
      </div>
    </ErpDialog>
  )
}
