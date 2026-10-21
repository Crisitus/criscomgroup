"use client"

// 7 - Comunidad / suscripcion (POST /api/community/subscribe {email, consentimiento:true, fuente:"home"}).
// Checkbox de consentimiento obligatorio; error 400 del backend bajo el campo; exito con su mensaje.
import { useState } from "react"
import { AlertTriangle, CircleCheck } from "lucide-react"
import { apiErrorMessage, homeService } from "@/services/homeService"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const CommunitySection = () => {
  const [email, setEmail] = useState("")
  const [consent, setConsent] = useState(false)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [consentError, setConsentError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sending) return
    setEmailError(null)
    setConsentError(null)
    const value = email.trim()
    if (!EMAIL_RE.test(value) || value.length > 180) {
      setEmailError("Ingresa un correo válido, por ejemplo nombre@dominio.com.")
      return
    }
    if (!consent) {
      setConsentError("Debes aceptar el consentimiento para unirte.")
      return
    }
    setSending(true)
    try {
      const res = await homeService.suscribirComunidad(value)
      setDone(res.message || "Ya formas parte de la comunidad CRISCOM")
    } catch (error) {
      setEmailError(apiErrorMessage(error, "No pudimos completar la suscripción. Inténtalo de nuevo."))
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="sec pg-wrap" aria-label="Comunidad">
      <div className="comm">
        <div>
          <h2>Únete a la comunidad CRISCOM</h2>
          <p className="lead">Recibe novedades y ofertas de CRISCOM GROUP en tu correo.</p>
        </div>

        {done ? (
          <div className="okbox" role="status">
            <CircleCheck className="pg-ic" aria-hidden />
            <span>{done}</span>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <label className="lbl" htmlFor="comm-email">Correo electrónico</label>
            <div className="frow">
              <input
                className="inp"
                id="comm-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={180}
                placeholder="nombre@dominio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? "comm-email-err" : undefined}
              />
              <button className="btn btn-primary" type="submit" disabled={sending}>
                {sending ? "Enviando…" : "Unirme"}
              </button>
            </div>
            {emailError && (
              <p className="err" id="comm-email-err" role="alert">
                <AlertTriangle style={{ width: 16, height: 16, flex: "none" }} aria-hidden />
                <span>{emailError}</span>
              </p>
            )}
            <label className="chk">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                aria-invalid={Boolean(consentError)}
                aria-describedby={consentError ? "comm-consent-err" : undefined}
              />
              <span>Acepto recibir novedades de CRISCOM GROUP y que usen mi correo para ese fin.</span>
            </label>
            {consentError && (
              <p className="err" id="comm-consent-err" role="alert">
                <AlertTriangle style={{ width: 16, height: 16, flex: "none" }} aria-hidden />
                <span>{consentError}</span>
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  )
}

export default CommunitySection
