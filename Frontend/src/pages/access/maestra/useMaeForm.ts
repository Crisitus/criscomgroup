import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { fetchMasterAccount, parseApiFail, patchMasterAccount, type MasterAccount } from "../../../services/accessService"
import { LIMIT_MSG, LOGIN_URL, NOPW, OK_NAME, OK_PASS, reqFlags } from "./maeCommon"
import type { Notice } from "./useMaeGrants"

export type Why = { text: string; bad?: boolean } | null
const FIELD_IDS: Record<string, string> = { name: "mae-nombre", current_password: "mae-actual", new_password: "mae-nueva" }
const ORDER = ["name", "current_password", "new_password"]

/** Ficha + cambio de contrasena: PATCH /users/master-account (la actual es obligatoria siempre). */
export function useMaeForm(enabled: boolean, logout: () => void, setNotice: (n: Notice) => void) {
  const [status, setStatus] = useState<"load" | "ok" | "err" | "403">("load")
  const [account, setAccount] = useState<MasterAccount | null>(null)
  const [name, setName] = useState("")
  const [cur, setCur] = useState("")
  const [nw, setNw] = useState("")
  const [cf, setCf] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [alert, setAlert] = useState("")
  const [limited, setLimited] = useState(false)
  const [busy, setBusy] = useState(false)
  const [closing, setClosing] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [expired, setExpired] = useState(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  const load = useCallback(async () => {
    setStatus("load")
    try {
      const a = await fetchMasterAccount()
      if (!alive.current) return
      setAccount(a); setName(a.name); setStatus("ok")
    } catch (e) {
      if (!alive.current) return
      setStatus(parseApiFail(e, "").status === 403 ? "403" : "err")
    }
  }, [])
  useEffect(() => { if (enabled) void load() }, [enabled, load])

  const flags = useMemo(() => reqFlags(nw, cur), [nw, cur])
  const mode: "pw" | "name" = nw ? "pw" : "name"
  const changed = !!account && (name.trim() !== account.name || !!nw)
  const locked = status !== "ok" || busy || closing

  const why: Why = useMemo(() => {
    if (status !== "ok") return { text: "Reintenta cargar tu ficha para poder guardar." }
    if (closing) return { text: "Sesión cerrada: inicia sesión de nuevo para continuar." }
    if (limited) return { text: "No se puede guardar ahora: se superó el límite de intentos fallidos.", bad: true }
    if (!changed) return { text: NOPW }
    if (!cur) return { text: "Escribe tu contraseña actual: siempre se pide, también para cambiar solo el nombre." }
    if (nw && cf !== nw) return { text: "La confirmación no coincide con la nueva contraseña." }
    return null
  }, [status, closing, limited, changed, cur, nw, cf])

  const focusFirst = (errs: Record<string, string>) => {
    const k = ORDER.find(x => errs[x])
    if (k) window.setTimeout(() => document.getElementById(FIELD_IDS[k])?.focus(), 250)
  }

  const save = async () => {
    setConfirm(false); setBusy(true); setErrors({}); setAlert(""); setNotice(null)
    try {
      const r = await patchMasterAccount({ name: name.trim(), current_password: cur, ...(nw ? { new_password: nw } : {}) })
      setCur(""); setNw(""); setCf(""); setLimited(false)
      if (r.sesiones_cerradas) {
        setClosing(true)
        setNotice({ tone: "ok", title: OK_PASS, sm: "Se cerraron todas las sesiones, también esta. Te llevamos a /login." })
        window.setTimeout(() => { logout(); window.location.assign(LOGIN_URL) }, 1600)
      } else {
        setAccount(a => (a ? { ...a, name: r.name } : a)); setName(r.name)
        setNotice({ tone: "ok", title: OK_NAME, sm: `Tu nombre ahora es «${r.name}». Tu sesión sigue abierta.` })
      }
    } catch (e) {
      const f = parseApiFail(e, "No se pudo actualizar la cuenta maestra")
      if (f.status === 422) { setErrors(f.fields); if (!Object.keys(f.fields).length) setAlert(f.message); focusFirst(f.fields) }
      else if (f.status === 429) { setLimited(true); setAlert(f.message || LIMIT_MSG) }
      else if (f.status === 401) setExpired(true)
      else if (f.status === 403) setStatus("403")
      else setAlert(f.message)
    } finally { if (alive.current) setBusy(false) }
  }

  /** Cambiar la contrasena cierra todas las sesiones: antes se pide confirmacion. */
  const submit = () => { if (why || busy) return; if (mode === "pw") setConfirm(true); else void save() }
  const onCur = (v: string) => { setCur(v); if (limited) { setLimited(false); setAlert("") } }
  const cfErr = cf && nw && cf !== nw ? "Las contraseñas no coinciden" : ""
  return { status, account, name, setName, cur, onCur, nw, setNw, cf, setCf, errors, alert, limited, busy, closing, confirm, setConfirm, expired, flags, mode, why, locked, submit, save, load, cfErr }
}
