import { useState } from "react"
import { mensajeError, purgeLogs } from "../../services/auditLogService"
import { FRASE, addDias, ddmm, hoyLima, leerFecha } from "./audCommon"

/** Purga por fecha de corte: contar (dryRun) -> frase exacta -> purgar. Nunca borra sin las dos cosas. */
export function useAudPurge(onDone: (deleted: number, fecha: string, logId: number | null) => void) {
  const [txt, setTxt] = useState(() => ddmm(addDias(hoyLima(), -1)))
  const [phrase, setPhrase] = useState("")
  const [count, setCount] = useState<number | null>(null)
  const [busy, setBusy] = useState<"" | "count" | "purge">("")
  const [err, setErr] = useState("")

  const iso = leerFecha(txt)
  const hoy = hoyLima()
  const fechaErr = iso === null ? "Escribe la fecha como dd/mm/aaaa." : iso === "" ? "Indica la fecha de corte." : iso >= hoy ? "La fecha de corte no puede ser hoy ni futura." : ""
  const puede = phrase === FRASE && count != null && count >= 1 && !fechaErr && busy === ""

  const setFecha = (v: string) => { setTxt(v); setCount(null); setErr("") }

  const contar = async () => {
    if (fechaErr || !iso) { setErr(fechaErr); return }
    setBusy("count"); setErr("")
    try {
      const r = await purgeLogs({ beforeDate: iso, dryRun: true })
      setCount(r.count ?? 0)
    } catch (error) { setCount(null); setErr(mensajeError(error, "No se pudo contar los logs.")) }
    finally { setBusy("") }
  }

  const purgar = async () => {
    if (!puede || !iso) return false
    setBusy("purge"); setErr("")
    try {
      const r = await purgeLogs({ beforeDate: iso, confirmacion: FRASE })
      onDone(r.deletedCount ?? 0, ddmm(iso), r.auditoria_id ?? null)
      return true
    } catch (error) { setErr(mensajeError(error, "No se pudo purgar el historial.")); return false }
    finally { setBusy("") }
  }

  return { txt, setFecha, phrase, setPhrase, count, busy, err, fechaErr, puede, contar, purgar, iso }
}
