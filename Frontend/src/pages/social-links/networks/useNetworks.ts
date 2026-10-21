import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { getSocialLinks, updateSocialLinks, type SocialLinks } from "../../../services/socialLinksService"
import { getApiErrorMessage } from "../../../services/marketingService"
import { EMPTY_LINKS, NET, checkNet } from "./netCheck"

export function useNetworks() {
  const [base, setBase] = useState<SocialLinks>(EMPTY_LINKS)
  const [links, setLinks] = useState<SocialLinks>(EMPTY_LINKS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    getSocialLinks()
      .then(d => { const v = { ...EMPTY_LINKS, ...d }; setBase(v); setLinks(v) })
      .catch(e => {
        const m = getApiErrorMessage(e, "No se pudieron cargar las redes sociales")
        setLoadError(m)
        toast.error(m)
      })
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const dirty = NET.filter(n => (links[n.k] || "") !== (base[n.k] || "")).length
  const bad = NET.filter(n => checkNet(n, links[n.k]).s === "bad").length
  const canSave = !loading && !saving && !loadError && dirty > 0 && bad === 0

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      const payload = Object.fromEntries(NET.map(n => [n.k, checkNet(n, links[n.k]).v || ""])) as unknown as SocialLinks
      const updated = { ...EMPTY_LINKS, ...(await updateSocialLinks(payload)) }
      setBase(updated); setLinks(updated)
      toast.success("Redes sociales actualizadas en la página web")
    } catch (e) {
      toast.error(getApiErrorMessage(e, "No se pudo guardar la configuración"))
    } finally { setSaving(false) }
  }

  return {
    links, loading, saving, loadError, dirty, bad, canSave, load, save,
    set: (k: keyof SocialLinks, v: string) => setLinks(c => ({ ...c, [k]: v })),
    discard: () => setLinks(base),
  }
}
export type Networks = ReturnType<typeof useNetworks>
