import { useEffect, useState } from "react"
import { ChevronRight, Clock, Lock, LogIn, RefreshCw, ServerCrash, Store } from "lucide-react"
import type { Actor } from "./usrRules"
import { fmtDT, limaMs } from "./usrCommon"
import type { useUsrAffiliates } from "./useUsrAffiliates"
import { Chip, I, Msg, Skeleton } from "./UsrParts"
import { BizChips, UsrAffDetail } from "./UsrAffDetail"

type Aff = ReturnType<typeof useUsrAffiliates>

function Proxima({ a, id }: { a: Aff; id: number }) {
  const b = a.data.find(x => x.id_affiliate_business === id)!
  const p = a.proxima(b)
  if (!p) return <span className="hint">Sin liquidaciones</span>
  const vencida = limaMs(p.vence_en) < Date.now()
  return <span><Chip t={vencida ? "er" : "wn"} icon={Clock} x={vencida ? "Vencida" : "Por vencer"} /><br />{fmtDT(p.vence_en)}</span>
}

export function UsrAffiliates({ a, actor, focus }: { a: Aff; actor: Actor; focus: number | null }) {
  const [sel, setSel] = useState<number | null>(null)
  useEffect(() => { if (focus != null) setSel(focus) }, [focus])
  useEffect(() => { if (a.state === "ok" && sel == null && a.data[0]) setSel(a.data[0].id_affiliate_business) }, [a.state, a.data, sel])
  const cur = a.data.find(b => b.id_affiliate_business === sel)

  if (a.state === "load") return <section className="sp"><Skeleton rows={4} /></section>
  if (a.state === "forbidden") return <section className="sp"><Msg icon={Lock} tone="wn" title="Sin permiso para ver los afiliados">{a.msg}</Msg></section>
  if (a.state === "unauth") return <section className="sp"><Msg icon={LogIn} tone="wn" title="Tu sesión terminó">Vuelve a iniciar sesión para continuar.</Msg></section>
  if (a.state === "error") return <section className="sp"><Msg icon={ServerCrash} tone="er" title="No se pudieron cargar los afiliados" action={<button type="button" className="btn out" onClick={() => void a.load()}>{I(RefreshCw, 16)}Reintentar</button>}>{a.msg}</Msg></section>
  if (a.data.length === 0) return <section className="sp"><Msg icon={Store} title="No hay negocios afiliados">Un negocio afiliado se crea al dar de alta a un vendedor de tipo Afiliado.</Msg></section>

  return (
    <div className="aff">
      <section className="sp tbl" aria-label="Negocios afiliados">
        <div className="at ath" aria-hidden="true"><span>Negocio</span><span>Estado</span><span>Comisión</span><span>Próximo vencimiento</span><span /></div>
        <div role="list" style={{ overflowY: "auto" }}>
          {a.data.map(b => (
            <button type="button" role="listitem" key={b.id_affiliate_business} className={`at atr${b.id_affiliate_business === sel ? " sel" : ""}`} aria-pressed={b.id_affiliate_business === sel} onClick={() => setSel(b.id_affiliate_business)}>
              <span><b>{b.nombre_comercial}</b><small>Dueño: {a.owner(b)}</small></span>
              <span className="acts"><BizChips b={b} /></span>
              <span className="num">{Number(b.comision_porcentaje)} %</span>
              <Proxima a={a} id={b.id_affiliate_business} />
              <span className="vr">Ver{I(ChevronRight, 16)}</span>
            </button>
          ))}
        </div>
      </section>
      {cur && <UsrAffDetail key={cur.id_affiliate_business} b={cur} owner={a.owner(cur)} actor={actor} onChanged={() => void a.load()} />}
    </div>
  )
}
