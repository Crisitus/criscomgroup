"use client"

// /iniciar-sesion (port criscom-ecom-cuenta): una sola cabecera, tarjeta plana
// de 420 px, errores con icono + palabra, Google OAuth y chequeo de cuenta
// maestra conservados tal cual (el correo literal es lógica existente).
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import axios from "axios"
import { CircleAlert, CircleX, TriangleAlert, Search, UserPlus, ChevronRight } from "lucide-react"
import { ecommerceAuthService } from "@/services/ecommerceApi"
import GoogleSignInButton from "@/components/auth/GoogleSignInButton"
import { Al, Field } from "./CuentaBits"

const CORREO_MAESTRO = "cristophercalioro@gmail.com"

type FormAlert = { kind: "credenciales" | "desactivada" | "aviso" | "error"; texto?: string }

const LoginPanel = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || "/"
  const avisoSesion = searchParams.get("aviso") === "sesion"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errores, setErrores] = useState<{ email?: string; password?: string }>({})
  const [alerta, setAlerta] = useState<FormAlert | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    document.title = "Iniciar sesión · Criscom Group"
    // Con sesión activa: a Mi cuenta con aviso (antes redirigía en silencio al home).
    if (ecommerceAuthService.isAuthenticated()) {
      router.replace(searchParams.get("redirect") ? redirect : "/mi-cuenta?aviso=ya-sesion")
    }
  }, [router, redirect, searchParams])

  const destinoTrasLogin = (user?: { id_role: number; email: string }) => {
    const isMaster = user?.email.trim().toLowerCase() === CORREO_MAESTRO
    if (user && (user.id_role === 3 || isMaster)) {
      window.location.assign("/erp/")
    } else {
      router.push(redirect)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: typeof errores = {}
    if (!email.trim()) errs.email = "El correo es requerido"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "Ingresa un correo válido"
    if (!password) errs.password = "La contraseña es requerida"
    setErrores(errs)
    setAlerta(null)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    try {
      const response = await ecommerceAuthService.login(email.trim(), password)
      if (response.success) {
        destinoTrasLogin(response.user)
      } else {
        setAlerta({ kind: "credenciales", texto: response.msg })
      }
    } catch (error: unknown) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined
      if (status === 401) {
        setAlerta({ kind: "credenciales" })
      } else if (status === 403) {
        setAlerta({ kind: "desactivada" })
      } else if (axios.isAxiosError(error) && error.response) {
        setAlerta({ kind: "error", texto: "No se pudo iniciar sesión. Intenta de nuevo." })
      } else {
        setAlerta({ kind: "error", texto: "Error al conectar con el servidor" })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleLogin = async (credential: string) => {
    setGoogleLoading(true)
    setAlerta(null)
    try {
      const response = await ecommerceAuthService.googleLogin(credential)
      if (!response.success || !response.user) {
        setAlerta({ kind: "error", texto: response.msg || "No se pudo iniciar sesión con Google" })
        return
      }
      destinoTrasLogin(response.user)
    } catch {
      setAlerta({ kind: "error", texto: "No se pudo iniciar sesión con Google" })
    } finally {
      setGoogleLoading(false)
    }
  }

  const registroHref = searchParams.get("redirect")
    ? `/registro?redirect=${encodeURIComponent(redirect)}`
    : "/registro"

  return (
    <>
      <div className="ph">
        <h1>Iniciar sesión</h1>
      </div>
      <div className="auth">
        <form className="card fc" onSubmit={handleSubmit} noValidate>
          {avisoSesion && (
            <Al tono="a" icon={TriangleAlert}>
              <strong>Sesión vencida.</strong> Inicia sesión para ver tu cuenta.
            </Al>
          )}
          {alerta?.kind === "credenciales" && (
            <Al tono="r" icon={CircleAlert}>
              <strong>Credenciales incorrectas.</strong> Revisa tu correo y contraseña.
            </Al>
          )}
          {alerta?.kind === "desactivada" && (
            <Al tono="r" icon={CircleX}>
              <strong>Cuenta desactivada.</strong> Esta cuenta no puede ingresar por ahora.
              Comunícate con la tienda para reactivarla.
            </Al>
          )}
          {alerta?.kind === "error" && (
            <Al tono="r" icon={CircleAlert}>
              {alerta.texto}
            </Al>
          )}
          <Field
            id="login-email"
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="tucorreo@ejemplo.com"
            autoComplete="email"
            error={errores.email}
          />
          <Field
            id="login-pass"
            label="Contraseña"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            error={errores.password}
          />
          <button className="btn p w" type="submit" disabled={submitting}>
            {submitting ? "Ingresando…" : "Ingresar"}
          </button>
          {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
            <>
              <div className="gdiv">o continúa con</div>
              <div className="gbtn">
                <GoogleSignInButton onCredential={handleGoogleLogin} disabled={googleLoading} />
              </div>
            </>
          ) : null}
        </form>
        <aside className="card side">
          <Link className="lr" href="/seguimiento">
            <Search size={20} strokeWidth={1.75} aria-hidden />
            <span>
              <b>Consultar un código</b>
              <span className="s">Sigue un pedido, importación, ensamble o servicio sin cuenta.</span>
            </span>
            <span className="go"><ChevronRight size={18} strokeWidth={1.75} aria-hidden /></span>
          </Link>
          <Link className="lr" href={registroHref}>
            <UserPlus size={20} strokeWidth={1.75} aria-hidden />
            <span>
              <b>Crear cuenta</b>
              <span className="s">Reúne tus pedidos y solicitudes en un solo lugar.</span>
            </span>
            <span className="go"><ChevronRight size={18} strokeWidth={1.75} aria-hidden /></span>
          </Link>
        </aside>
      </div>
    </>
  )
}

export default LoginPanel
