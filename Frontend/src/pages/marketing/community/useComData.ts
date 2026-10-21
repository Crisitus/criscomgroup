import { useCallback, useEffect, useRef, useState } from "react"
import { getCampaignStatus, getCommunity, type CampaignStatus, type CommunityList, type CommunityQuery } from "../../../services/communityService"
import { errMsg } from "./comShared"

export type Status = "load" | "ok" | "error"

/** Carga la comunidad con los filtros de miembros y sondea las campañas que están enviando. */
export function useComData(query: CommunityQuery) {
  const [data, setData] = useState<CommunityList | null>(null)
  const [status, setStatus] = useState<Status>("load")
  const [error, setError] = useState("")
  const [live, setLive] = useState<Record<number, CampaignStatus>>({})
  const qref = useRef(query)
  qref.current = query
  const key = JSON.stringify(query)

  const load = useCallback(async () => {
    try {
      setData(await getCommunity(qref.current))
      setStatus("ok")
      setError("")
    } catch (e) {
      setStatus(s => (s === "load" ? "error" : s))
      setError(errMsg(e, "Revisa la conexión e inténtalo de nuevo."))
    }
  }, [])
  useEffect(() => { void load() }, [load, key])

  const sendingIds = (data?.campaigns || []).filter(c => c.estado === "enviando").map(c => c.id_campaign)
  const idsKey = sendingIds.join(",")
  useEffect(() => {
    if (!idsKey) { setLive({}); return }
    const ids = idsKey.split(",").map(Number)
    let stop = false
    const tick = async () => {
      const rs = await Promise.allSettled(ids.map(id => getCampaignStatus(id)))
      if (stop) return
      const next: Record<number, CampaignStatus> = {}
      let finished = false
      rs.forEach(r => { if (r.status === "fulfilled") { next[r.value.id_campaign] = r.value; if (r.value.estado !== "enviando") finished = true } })
      setLive(next)
      if (finished) void load()
    }
    const t = setInterval(() => void tick(), 2000)
    void tick()
    return () => { stop = true; clearInterval(t) }
  }, [idsKey, load])

  const retry = () => { setStatus("load"); void load() }
  return { data, status, error, live, load, retry }
}
