import { useMemo } from "react"
import { fetchIntegrations } from "../../../services/companyService"
import { getGatewayCatalog, listPaymentGateways } from "../../../services/paymentGatewayService"
import { useBlock } from "./usePagBlock"

/** Pasarelas web (catálogo + guardadas) y origen real de las llaves con que cobra la tienda hoy. */
export function usePagGateway() {
  const web = useBlock(async () => {
    const [catalog, list] = await Promise.all([getGatewayCatalog(), listPaymentGateways()])
    return { catalog, gateways: list.gateways, advertencias: list.advertencias }
  })
  const integ = useBlock(fetchIntegrations)

  const view = useMemo(() => {
    const catalog = web.data?.catalog ?? []
    const integrated = catalog.filter(c => c.integrated)
    const item = integrated[0]
    const gw = item ? web.data?.gateways.find(g => g.provider === item.provider) : undefined
    const culqi = integ.data?.culqi ?? null
    return {
      item,
      gw,
      integrated,
      prep: catalog.filter(c => !c.integrated),
      advertencias: web.data?.advertencias ?? [],
      source: culqi ? (culqi.source as string) : null,
      sourceMode: culqi?.mode ?? null,
    }
  }, [web.data, integ.data])

  const reloadAll = async () => { await Promise.all([web.reload(), integ.reload()]) }
  return { web, integ, ...view, reloadAll }
}
export type PagGatewayCtl = ReturnType<typeof usePagGateway>
