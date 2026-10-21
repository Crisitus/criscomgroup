import { Search, Users, X } from "lucide-react"
import type { CommunityList, CommunityMember } from "../../../services/communityService"
import { ErrorBox, Skeleton } from "./CampaignList"
import { I, Q } from "./comShared"
import { MemberCards, MemberTable } from "./MemberRows"
import { MemberPager } from "./MemberPager"
import type { MemberQuery } from "./MemberFilters"
import type { Status } from "./useComData"

export function MembersBody({ data, status, error, mq, set, mob, onBaja, onRetry, onClear }: {
  data: CommunityList | null; status: Status; error: string; mq: MemberQuery; set: (p: Partial<MemberQuery>) => void
  mob: boolean; onBaja: (m: CommunityMember) => void; onRetry: () => void; onClear: () => void
}) {
  if (status === "load" || (!data && status !== "error")) return <Skeleton rows={8} />
  if (!data) return <ErrorBox msg={error} onRetry={onRetry} />
  const rows = data.members
  const filtered = !!(mq.q || mq.estado || mq.fuente)
  if (!rows.length && !filtered && data.activos + data.bajas === 0) {
    return <div className="tcard em"><span className="dic">{I(Users, 22)}</span><h2>Aún no hay miembros</h2><p>Las personas se suman desde el pie de la tienda o la casilla del registro, con su consentimiento.</p></div>
  }
  if (!rows.length) {
    return (
      <div className="tcard em"><span className="dic">{I(Search, 22)}</span><h2>Sin resultados</h2>
        <p>Ningún miembro coincide con {Q(mq.q)} y los filtros activos.</p>
        <button type="button" className="btn out" onClick={onClear}>{I(X, 16)}Limpiar filtros</button></div>
    )
  }
  const pager = <MemberPager page={data.page} limit={data.limit} total={data.total} shown={rows.length} set={page => set({ page })} bare={mob} />
  if (mob) return <><MemberCards rows={rows} onBaja={onBaja} />{pager}</>
  return <div className="tcard"><MemberTable rows={rows} onBaja={onBaja} />{pager}</div>
}
