"use client"

// /registro (port criscom-ecom-cuenta): 3 campos como el backend
// (name, email, password min 6), error por campo + resumen arriba.
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import axios from "axios"
import { CircleAlert, LogIn, Search, ChevronRight } from "lucide-react"
import { ecommerceAuthService } from "@/services/ecommerceApi"
import { Al, Field } from "./CuentaBits"

type Errores = { name?: string; email?: string; password?: string }

const RegistroPanel = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || "/"

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errores, setErrores] = useState<Errores>({})
  const [alerta, setAlerta] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    document.title = "Crear cuenta · Criscom Group"
    if (ecommerceAuthService.isAuthenticated()) {
      router.replace(searchParams.get("redirect") ? redirect : "/mi-cuenta?aviso=ya-sesion")
    }
  }, [router, redirect, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Errores = {}
    if (!name.trim()) errs.name = "El nombre es requerido"
    else if (name.trim().length < 3) errs.name = "El nombre debe tener al menos 3 caracteres"
    if (!email.trim()) errs.email = "El correo es requerido"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "Ingresa un correo válido"
    if (!password) errs.password = "La contraseña es requerida"
    else if (password.length < 6) errs.password = "Debe tener al menos 6 caracteres."
    setErrores(errs)
    setAlerta(null)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    try {
      const response = await ecommerceAuthService.register({
        name: name.trim(),
        email: email.trim(),
        password,
      })
      if (response.success) {
        router.push(redirect)
        return
      }
      const errsApi: Errores = {}
      response.errors?.forEach((error) => {
        if (error.param === "name" || error.param === "email" || error.param === "password") {
          errsApi[error.param] = error.msg
        }
      })
      if (response.msg && !response.errors) {
        errsApi.email = response.msg
      }
      setErrores(errsApi)
      if (Object.keys(errsApi).length === 0) {
        setAlerta(response.msg || "Error al crear la cuenta")
      }
    } catch (error: unknown) {
      // 400: validación ({errors:[{param,msg}]}) o correo duplicado ({msg}).
      const data = axios.isAxiosError(error)
        ? (error.response?.data as { msg?: string; errors?: { param?: string; msg: string }[] } | undefined)
        : undefined
      if (data && (data.errors || data.msg)) {
        const errsApi: Errores = {}
        data.errors?.forEach((e) => {
          if (e.param === "name" || e.param === "email" || e.param === "password") errsApi[e.param] = e.msg
        })
        if (data.msg && !data.errors) errsApi.email = data.msg
        setErrores(errsApi)
        if (Object.keys(errsApi).length === 0) setAlerta(data.msg ?? "Error al crear la cuenta")
      } else if (axios.isAxiosError(error) && error.response) {
        setAlerta("No se pudo crear la cuenta. Intenta de nuevo.")
      } else {
        setAlerta("Error al conectar con el servidor")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const loginHref = searchParams.get("redirect")
    ? `/iniciar-sesion?redirect=${encodeURIComponent(redirect)}`
    : "/iniciar-sesion"
  const listaErrores = (Object.keys(errores) as (keyof Errores)[]).filter((k) => errores[k])

  const resumenItem = (k: keyof Errores) => {
    const ids: Record<keyof Errores, string> = { name: "reg-name", email: "reg-email", password: "reg-pass" }
    const labels: Record<keyof Errores, string> = { name: "Nombre", email: "Correo", password: "Contraseña" }
    return (
      <li key={k}>
        <a href={`#${ids[k]}`}>{`${labels[k]}: ${errores[k]}`}</a>
      </li>
    )
  }

  return (
    <>
      <div className="ph">
        <h1>Crear cuenta</h1>
      </div>
      <div className="auth">
        <form className="card fc" onSubmit={handleSubmit} noValidate>
          {listaErrores.length > 1 && (
            <Al tono="r" icon={CircleAlert}>
              <strong>{`Revisa ${listaErrores.length} campos antes de continuar`}</strong>
              <ul>{listaErrores.map(resumenItem)}</ul>
            </Al>
          )}
          {alerta && (
            <Al tono="r" icon={CircleAlert}>
              {alerta}
            </Al>
          )}
          <Field
            id="reg-name"
            label="Nombre"
            value={name}
            onChange={setName}
            autoComplete="name"
            error={errores.name}
          />
          <Field
            id="reg-email"
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="tucorreo@ejemplo.com"
            autoComplete="email"
            error={errores.email}
          />
          <Field
            id="reg-pass"
            label="Contraseña"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            error={errores.password}
            hint={errores.password ? undefined : "Mínimo 6 caracteres."}
          />
          <button className="btn p w" type="submit" disabled={submitting}>
            {submitting ? "Creando cuenta…" : "Crear cuenta"}
          </button>
        </form>
        <aside className="card side">
          <Link className="lr" href={loginHref}>
            <LogIn size={20} strokeWidth={1.75} aria-hidden />
            <span>
              <b>Ya tengo cuenta</b>
              <span className="s">Inicia sesión para ver tus pedidos y solicitudes.</span>
            </span>
            <span className="go"><ChevronRight size={18} strokeWidth={1.75} aria-hidden /></span>
          </Link>
          <Link className="lr" href="/seguimiento">
            <Search size={20} strokeWidth={1.75} aria-hidden />
            <span>
              <b>Consultar un código</b>
              <span className="s">Haz seguimiento sin cuenta.</span>
            </span>
            <span className="go"><ChevronRight size={18} strokeWidth={1.75} aria-hidden /></span>
          </Link>
        </aside>
      </div>
    </>
  )
}

export default RegistroPanel
