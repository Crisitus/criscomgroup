import { useLayoutEffect, useRef, useState } from "react"
import { Plus } from "lucide-react"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { BlogEditor, EditorEmpty, EditorLoading } from "./blog/BlogEditor"
import { BlogList } from "./blog/BlogList"
import { DeleteDialog, LeaveDialog } from "./blog/BlogDialogs"
import { I } from "./blog/blogParts"
import { useBlogEditor } from "./blog/useBlogEditor"
import { useBlogList } from "./blog/useBlogList"
import "../../styles/blog.css"

export default function BlogManagerPage() {
  useDocumentTitle("Blog y contenidos")
  const list = useBlogList()
  const ed = useBlogEditor(list.load)
  const [width, setWidth] = useState(1200)
  const host = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = host.current
    if (!el) return
    const ro = new ResizeObserver(([r]) => setWidth(Math.round(r.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const mob = width < 640
  const selId = ed.sel.kind === "post" ? ed.sel.id : null
  const open = ed.sel.kind !== "none"

  const listCard = (
    <BlogList mode={list.status === "load" ? "loading" : list.status === "error" ? "error" : "rows"} rows={list.rows} shown={list.shown} total={list.rows.length}
      counts={list.counts} cats={list.cats} q={list.q} est={list.est} cat={list.cat} selId={selId} hasAny={list.posts.length > 0} mob={mob}
      onQ={list.setQ} onEst={list.setEst} onCat={list.setCat} onPick={ed.openPost} onMore={list.more} onRetry={() => void list.load()} onClear={list.clear} onNew={ed.openNew} />
  )
  const editorCard = !open ? <EditorEmpty onNew={ed.openNew} />
    : ed.loadingPost ? <EditorLoading post={ed.loadingPost} onClose={ed.close} />
    : <BlogEditor f={ed.f} orig={ed.orig} errors={ed.errors} aviso={ed.aviso} set={ed.set} mob={mob} dirty={ed.dirty} saving={ed.saving} savedAt={ed.savedAt}
        det={ed.det} cats={list.cats} isNew={ed.sel.kind === "new"} onDet={ed.setDet} onSave={() => void ed.save()} onClose={ed.close} onDelete={() => ed.orig && ed.setToDelete(ed.orig)} />

  return (
    <div className="pg-blog fx" ref={host}>
      <div className="pg" style={mob && open ? { gap: 0 } : undefined}>
        {!(mob && open) && (
          <div className="hd">
            <h1>Blog y contenidos</h1>
            {mob
              ? <button type="button" className="ib pri" aria-label="Nueva publicación" onClick={ed.openNew}>{I(Plus, 20)}</button>
              : <button type="button" className="btn" onClick={ed.openNew}>{I(Plus, 16)}Nueva publicación</button>}
          </div>
        )}
        {mob ? (open ? editorCard : <div className="mlist">{listCard}</div>) : <div className="ms">{listCard}{editorCard}</div>}
      </div>
      {ed.toDelete && <DeleteDialog post={ed.toDelete} busy={ed.deleting} onCancel={() => ed.setToDelete(null)} onConfirm={() => void ed.confirmDelete()} />}
      {ed.leave && <LeaveDialog changed={ed.changed} onStay={() => ed.setLeave(null)} onLeave={() => { const go = ed.leave; ed.setLeave(null); go?.() }} />}
    </div>
  )
}
