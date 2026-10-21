"use client"

import { useState, useRef, useEffect } from "react"
import { useNavigate, Navigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react"
import { Form, FormControl, FormField, FormItem, FormMessage } from "../../components/ui/form"
import { useAuth } from "../../contexts/AuthContext"
import { useTheme } from "../../lib/theme"
import { motion, AnimatePresence } from "framer-motion"
// import { ThemeToggle } from "../../components/theme-toggle"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"

const loginSchema = z.object({
  email: z.string().email("Ingrese un correo electrónico válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
})

type LoginFormValues = z.infer<typeof loginSchema>

const LoginPage = () => {
  useDocumentTitle("Inicio de Sesión")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [activeField, setActiveField] = useState<string | null>(null)
  const { login, isAuthenticated, checkAuth } = useAuth()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const [isAuth, setIsAuth] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [pageLoaded, setPageLoaded] = useState(false)
  // const [loginSuccess, setLoginSuccess] = useState(false)

  // Para animación de partículas
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; size: number; color: string; shadow: string; speed: number }>
  >([])

  useEffect(() => {
    // Crear partículas aleatorias con colores basados en el tema
    const newParticles = Array.from({ length: 25 }).map((_, i) => {
      // Colores para tema claro
      let r, g, b

      if (theme === "light") {
        // Colores pastel para tema claro
        r = Math.floor(Math.random() * 100) + 155 // 155-255
        g = Math.floor(Math.random() * 100) + 155 // 155-255
        b = Math.floor(Math.random() * 100) + 155 // 155-255
      } else {
        // Colores más saturados para tema oscuro
        r = Math.floor(Math.random() * 200) + 55 // 55-255
        g = Math.floor(Math.random() * 200) + 55 // 55-255
        b = Math.floor(Math.random() * 200) + 55 // 55-255
      }

      return {
        id: i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 6 + 2,
        color: `rgba(${r}, ${g}, ${b}, ${theme === "light" ? 0.2 : 0.3})`,
        shadow: `0 0 ${Math.random() * 10 + 5}px rgba(${r}, ${g}, ${b}, ${theme === "light" ? 0.3 : 0.5})`,
        speed: Math.random() * 15 + 10, // Velocidad aleatoria para cada partícula
      }
    })

    setParticles(newParticles)

    // Establecer pageLoaded como true después de un breve retraso
    const timer = setTimeout(() => {
      setPageLoaded(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [theme])

  useEffect(() => {
    // Verificar si ya está autenticado al cargar la página
    const auth = checkAuth()
    setIsAuth(auth)

    // Check for session_expired flag
    const sessionExpired = localStorage.getItem("session_expired")
    if (sessionExpired) {
      toast.error("Tu sesión ha expirado. Por favor inicia sesión nuevamente.")
      localStorage.removeItem("session_expired")
    }

    // Asegurarse de que el tema se aplique correctamente
    const storedTheme = localStorage.getItem("erp-computacion-theme")
    if (storedTheme) {
      const themeData = JSON.parse(storedTheme)
      const currentTheme = themeData.state?.theme || "light"

      if (currentTheme === "dark") {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }
  }, [checkAuth])

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  // Si ya está autenticado, redirigir al dashboard
  if (isAuth || isAuthenticated) {
    return <Navigate to="/" />
  }

  const focusField = (field: string) => {
    setActiveField(field)
    if (field === "email" && emailRef.current) {
      emailRef.current.focus()
    } else if (field === "password" && passwordRef.current) {
      passwordRef.current.focus()
    }
  }

  // Variantes para animaciones
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1,
        delayChildren: 0.2,
        duration: 0.5,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  }

  const decorationVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (i: number) => ({
      scale: 1,
      opacity: 1,
      transition: {
        delay: 0.2 + i * 0.2,
        duration: 0.8,
        ease: "easeOut",
      },
    }),
  }
  const handleLogin = async (data: LoginFormValues) => {
    setIsLoading(true)
    try {
      await login(data.email, data.password)
      navigate("/")
    } catch (error: any) {
      setIsLoading(false)

      // Verificar si es un error de restricción horaria
      if (error.message && error.message.includes("Acceso denegado fuera del horario laboral")) {
        toast.error(error.message, {
          duration: 5000,
        })
      } 
      // Verificar si es un error de autorización por rol
      else if (error.message && error.message.includes("No tienes autorización para acceder al sistema")) {
        toast.error("No tienes autorización para acceder al sistema. Contacta con un administrador.", {
          duration: 6000,
        })
      }
      // Otros errores
      else {
        const status = error.response?.status
        const apiMsg = error.response?.data?.msg || error.response?.data?.message
        // Credenciales incorrectas: el backend responde 401 (400 en casos de validación)
        if (status === 401 || status === 400) {
          toast.error(apiMsg || "Credenciales incorrectas")
        } else if (error.response) {
          // El servidor respondió con otro error (500, etc.)
          toast.error(apiMsg || "No se pudo iniciar sesión. Intenta de nuevo.")
        } else {
          // Solo error de red REAL (sin respuesta del servidor)
          toast.error("Error al conectar con el servidor")
        }
      }
    }
  }

  return (
    <div className={`min-h-screen w-full relative overflow-x-hidden transition-all duration-500 ${
      theme === 'light' 
        ? 'bg-gradient-to-br from-slate-50 to-blue-100 text-slate-800' 
        : 'bg-gradient-to-br from-slate-900 to-indigo-900 text-slate-100'
    }`}>
      <AnimatePresence>
        {pageLoaded && (
          <>            {/* Decoraciones de fondo */}
            <motion.div
              className={`absolute top-[10%] left-[5%] w-72 h-72 rounded-full blur-3xl opacity-20 ${
                theme === 'light' 
                  ? 'bg-purple-400' 
                  : 'bg-purple-600'
              }`}
              custom={1}
              initial="hidden"
              animate="visible"
              variants={decorationVariants}
            />
            <motion.div
              className={`absolute bottom-[20%] right-[10%] w-64 h-64 rounded-full blur-3xl opacity-20 ${
                theme === 'light' 
                  ? 'bg-blue-400' 
                  : 'bg-blue-600'
              }`}
              custom={2}
              initial="hidden"
              animate="visible"
              variants={decorationVariants}
            />
            <motion.div
              className={`absolute top-[40%] right-[30%] w-48 h-48 rounded-full blur-3xl opacity-20 ${
                theme === 'light' 
                  ? 'bg-pink-400' 
                  : 'bg-pink-600'
              }`}
              custom={3}
              initial="hidden"
              animate="visible"
              variants={decorationVariants}
            />            {/* Patrón de grid de fondo */}
            <motion.svg
              className={`absolute inset-0 w-full h-full ${
                theme === 'light' ? 'text-slate-300' : 'text-slate-600'
              } opacity-30`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ delay: 0.5, duration: 1.5 }}
            >
              <pattern id="grid-pattern" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid-pattern)" />
            </motion.svg>
          </>
        )}
      </AnimatePresence>      {/* Partículas flotantes */}
      <div className="absolute w-full h-full overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full pointer-events-none"
            initial={{
              x: particle.x,
              y: particle.y,
              opacity: 0,
            }}
            animate={{
              x: [particle.x, Math.random() * window.innerWidth, Math.random() * window.innerWidth],
              y: [particle.y, Math.random() * window.innerHeight, Math.random() * window.innerHeight],
              opacity: [0, 0.7, 0.3],
            }}
            transition={{
              duration: particle.speed,
              delay: Math.random() * 1,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
              boxShadow: particle.shadow,
            }}
          />
        ))}
      </div>

      {/* Botón de tema */}
      <motion.div
        className="fixed top-6 right-6 z-50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        {/* <ThemeToggle /> */}
      </motion.div>      {/* Contenedor principal */}
      <motion.div
        className="w-full min-h-screen p-4 relative z-10 flex items-center justify-center"
        initial="hidden"
        animate={pageLoaded ? "visible" : "hidden"}
        variants={containerVariants}
      >
        <motion.div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16" variants={containerVariants}>
          {/* Sección izquierda - Branding e ilustración */}
          <motion.div className="w-full max-w-lg flex flex-col items-center lg:items-start" variants={itemVariants}>
            <div className="text-center lg:text-left mb-8">
              <motion.div
                className="inline-block mb-4 animate-float"
                variants={itemVariants}
                animate={{
                  rotate: [0, 5, 0, -5, 0],
                  scale: [1, 1.05, 1, 1.05, 1],
                }}
                transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY }}
              >
                <div className="w-24 h-24 mx-auto lg:mx-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-1 shadow-lg shadow-indigo-500/30">
                  <div className={`w-full h-full rounded-xl flex items-center justify-center transition-colors duration-300 ${
                    theme === 'light' ? 'bg-slate-50' : 'bg-slate-800'
                  }`}>
                    <span className={`text-4xl font-bold bg-gradient-to-r ${
                      theme === 'light' 
                        ? 'from-indigo-600 to-purple-600' 
                        : 'from-indigo-400 to-purple-400'
                    } bg-clip-text text-transparent`}>
                      CG
                    </span>
                  </div>
                </div>
              </motion.div>

              <motion.h1 className={`text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r ${
                theme === 'light' 
                  ? 'from-indigo-600 via-purple-600 to-pink-600' 
                  : 'from-indigo-400 via-purple-400 to-pink-400'
              } bg-clip-text text-transparent`} variants={itemVariants}>
                Criscom Group
              </motion.h1>

              <motion.p className={`text-lg mb-6 ${
                theme === 'light' ? 'text-slate-600' : 'text-slate-300'
              }`} variants={itemVariants}>
                Sistema de gestión de inventario y facturación para tu negocio
              </motion.p>

              <div className="hidden lg:block">
                <motion.div className="flex items-center mb-3 pl-2 relative hover:translate-x-1 transition-transform duration-300" variants={itemVariants}>
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-gradient-to-r ${
                    theme === 'light' ? 'from-indigo-600 to-blue-600' : 'from-indigo-400 to-blue-400'
                  }`}></div>
                  <span>Gestiona tu inventario de manera eficiente</span>
                </motion.div>

                <motion.div className="flex items-center mb-3 pl-2 relative hover:translate-x-1 transition-transform duration-300" variants={itemVariants}>
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-gradient-to-r ${
                    theme === 'light' ? 'from-purple-600 to-violet-600' : 'from-purple-400 to-violet-400'
                  }`}></div>
                  <span>Controla tus ventas en tiempo real</span>
                </motion.div>

                <motion.div className="flex items-center mb-3 pl-2 relative hover:translate-x-1 transition-transform duration-300" variants={itemVariants}>
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-gradient-to-r ${
                    theme === 'light' ? 'from-fuchsia-600 to-pink-600' : 'from-fuchsia-400 to-pink-400'
                  }`}></div>
                  <span>Genera reportes detallados</span>
                </motion.div>
              </div>
            </div>            {/* Ilustración con animación */}
            <motion.div className="hidden lg:block relative w-full max-w-lg mt-8" variants={itemVariants}>
              <svg className="w-full h-auto" viewBox="0 0 500 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                <motion.path
                  d="M140.5 32C63.5 32 0.5 95 0.5 172C0.5 249 63.5 312 140.5 312H359.5C436.5 312 499.5 249 499.5 172C499.5 95 436.5 32 359.5 32H140.5Z"
                  className="fill-indigo-500/10"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.5, delay: 0.5 }}
                />
                <motion.rect
                  x="107.5"
                  y="107"
                  width="285"
                  height="130"
                  rx="10"
                  className={theme === 'light' ? 'fill-white' : 'fill-slate-800'}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                />
                <motion.rect
                  x="127.5"
                  y="137"
                  width="120"
                  height="10"
                  rx="5"
                  className={theme === 'light' ? 'fill-slate-300' : 'fill-slate-600'}
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 120 }}
                  transition={{ duration: 0.4, delay: 1.1 }}
                />
                <motion.rect
                  x="127.5"
                  y="157"
                  width="80"
                  height="10"
                  rx="5"
                  className={theme === 'light' ? 'fill-slate-300' : 'fill-slate-600'}
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 80 }}
                  transition={{ duration: 0.3, delay: 1.2 }}
                />
                <motion.rect
                  x="127.5"
                  y="177"
                  width="100"
                  height="10"
                  rx="5"
                  className={theme === 'light' ? 'fill-slate-300' : 'fill-slate-600'}
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 100 }}
                  transition={{ duration: 0.3, delay: 1.3 }}
                />
                <motion.rect
                  x="127.5"
                  y="197"
                  width="60"
                  height="10"
                  rx="5"
                  className={theme === 'light' ? 'fill-slate-300' : 'fill-slate-600'}
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 60 }}
                  transition={{ duration: 0.2, delay: 1.4 }}
                />                <motion.circle
                  cx="307.5"
                  cy="172"
                  r="35"
                  className="fill-indigo-500"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.5 }}
                />
                <motion.path
                  d="M298.5 172L305.5 179L318.5 166"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.8 }}
                />
              </svg>
            </motion.div>
          </motion.div>          {/* Sección derecha - Formulario de login */}
          <motion.div className="w-full max-w-md flex flex-col items-center" variants={itemVariants}>
            <motion.div
              className={`w-full backdrop-blur-md border-none overflow-hidden relative rounded-2xl transition-all duration-300 shadow-2xl ${
                theme === 'light' 
                  ? 'bg-white/80 border border-slate-200/80 shadow-slate-900/8' 
                  : 'bg-slate-800/80 border border-slate-700/50 shadow-black/25'
              }`}
              variants={itemVariants}
              whileHover={{ boxShadow: "0 25px 50px rgba(0, 0, 0, 0.15)" }}
            >
              <motion.div
                className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
                  theme === 'light' 
                    ? 'from-indigo-600 via-purple-600 to-pink-600' 
                    : 'from-indigo-400 via-purple-400 to-pink-400'
                } animate-gradient-x`}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.8, delay: 1 }}
              />

              <div className="relative z-10 p-8">
                <motion.div className="mb-8 text-center" variants={itemVariants}>
                  <h2 className={`text-2xl font-bold mb-2 ${
                    theme === 'light' ? 'text-slate-800' : 'text-slate-100'
                  }`}>Bienvenido de nuevo</h2>
                  <p className={`text-sm ${
                    theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                  }`}>Ingresa tus credenciales para continuar</p>
                </motion.div>                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-6">
                    {/* Campo de email */}
                    <motion.div
                      className={`relative transition-all duration-300 mb-4 ${
                        activeField === "email" ? "transform -translate-y-1" : ""
                      }`}
                      variants={itemVariants}
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className={`absolute inset-0 rounded-2xl p-[1px] pointer-events-none transition-all duration-300 ${
                        activeField === "email" 
                          ? `bg-gradient-to-r ${
                              theme === 'light' 
                                ? 'from-indigo-600 via-purple-600 to-pink-600' 
                                : 'from-indigo-400 via-purple-400 to-pink-400'
                            } animate-gradient-x shadow-lg shadow-indigo-500/10` 
                          : theme === 'light' ? 'bg-slate-300' : 'bg-slate-600'
                      }`}></div>
                      <div className={`relative flex items-center rounded-xl p-1 transition-all duration-300 ${
                        theme === 'light' 
                          ? 'bg-white/90 shadow-inner' 
                          : 'bg-slate-800/90'
                      }`} onClick={() => focusField("email")}>
                        <div className={`flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-300 ${
                          activeField === "email" 
                            ? theme === 'light' 
                              ? 'bg-indigo-500/10 text-indigo-600' 
                              : 'bg-indigo-400/10 text-indigo-400'
                            : theme === 'light' 
                              ? 'bg-slate-50 text-slate-600' 
                              : 'bg-slate-700 text-slate-400'
                        }`}>
                          <Mail size={20} />
                        </div>
                        <div className="flex-1 ml-3">
                          <label htmlFor="email" className={`block text-xs font-medium mb-1 transition-all duration-200 ${
                            activeField === "email" 
                              ? theme === 'light' ? 'text-indigo-600' : 'text-indigo-400'
                              : theme === 'light' ? 'text-slate-600' : 'text-slate-300'
                          }`}>
                            Correo electrónico
                          </label>
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <input
                                    id="email"
                                    type="email"
                                    {...field}
                                    onFocus={() => setActiveField("email")}
                                    onBlur={() => setActiveField(null)}
                                    placeholder="nombre@empresa.com"
                                    className={`w-full bg-transparent border-none text-base outline-none py-2 px-3 transition-all duration-200 ${
                                      theme === 'light' ? 'text-slate-800 placeholder-slate-400' : 'text-slate-100 placeholder-slate-500'
                                    }`}
                                  />
                                </FormControl>
                                <FormMessage className="text-xs text-red-500 mt-1" />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </motion.div>                    {/* Campo de contraseña */}
                    <motion.div
                      className={`relative transition-all duration-300 mb-4 ${
                        activeField === "password" ? "transform -translate-y-1" : ""
                      }`}
                      variants={itemVariants}
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className={`absolute inset-0 rounded-2xl p-[1px] pointer-events-none transition-all duration-300 ${
                        activeField === "password" 
                          ? `bg-gradient-to-r ${
                              theme === 'light' 
                                ? 'from-indigo-600 via-purple-600 to-pink-600' 
                                : 'from-indigo-400 via-purple-400 to-pink-400'
                            } animate-gradient-x shadow-lg shadow-indigo-500/10` 
                          : theme === 'light' ? 'bg-slate-300' : 'bg-slate-600'
                      }`}></div>
                      <div className={`relative flex items-center rounded-xl p-1 transition-all duration-300 ${
                        theme === 'light' 
                          ? 'bg-white/90 shadow-inner' 
                          : 'bg-slate-800/90'
                      }`} onClick={() => focusField("password")}>
                        <div className={`flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-300 ${
                          activeField === "password" 
                            ? theme === 'light' 
                              ? 'bg-indigo-500/10 text-indigo-600' 
                              : 'bg-indigo-400/10 text-indigo-400'
                            : theme === 'light' 
                              ? 'bg-slate-50 text-slate-600' 
                              : 'bg-slate-700 text-slate-400'
                        }`}>
                          <Lock size={20} />
                        </div>
                        <div className="flex-1 ml-3">
                          <label htmlFor="password" className={`block text-xs font-medium mb-1 transition-all duration-200 ${
                            activeField === "password" 
                              ? theme === 'light' ? 'text-indigo-600' : 'text-indigo-400'
                              : theme === 'light' ? 'text-slate-600' : 'text-slate-300'
                          }`}>
                            Contraseña
                          </label>
                          <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="relative">
                                    <input
                                      id="password"
                                      type={showPassword ? "text" : "password"}
                                      {...field}
                                      onFocus={() => setActiveField("password")}
                                      onBlur={() => setActiveField(null)}
                                      placeholder="••••••••"
                                      className={`w-full bg-transparent border-none text-base outline-none py-2 px-3 pr-10 transition-all duration-200 ${
                                        theme === 'light' ? 'text-slate-800 placeholder-slate-400' : 'text-slate-100 placeholder-slate-500'
                                      }`}
                                    />
                                    <button
                                      type="button"
                                      className={`absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-1 transition-all duration-200 rounded hover:scale-110 ${
                                        theme === 'light' 
                                          ? 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-500/10' 
                                          : 'text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10'
                                      }`}
                                      onClick={() => setShowPassword(!showPassword)}
                                    >
                                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                  </div>
                                </FormControl>
                                <FormMessage className="text-xs text-red-500 mt-1" />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </motion.div>                    {/* Botón de inicio de sesión */}
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      className={`relative w-full h-14 rounded-xl overflow-hidden transition-all duration-300 mt-8 border-none cursor-pointer font-semibold text-base flex items-center justify-center text-white shadow-lg ${
                        theme === 'light' 
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/20 hover:shadow-indigo-500/30' 
                          : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-indigo-500/20 hover:shadow-indigo-500/30'
                      } ${isLoading ? 'animate-pulse' : ''}`}
                      variants={itemVariants}
                      whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Iniciando sesión...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <LogIn className="transition-transform duration-300 group-hover:-translate-x-1" size={20} />
                          <span>Iniciar sesión</span>
                        </div>
                      )}
                    </motion.button>

                    {/* Enlace de registro */}
                    <motion.div className="text-center mt-6" variants={itemVariants}>
                      <p className={theme === 'light' ? 'text-slate-600' : 'text-slate-400'}>
                        Contacta con un administrador si necesitas una cuenta
                      </p>
                    </motion.div>
                  </form>
                </Form>
              </div>
            </motion.div>            {/* Indicadores de seguridad */}
            <motion.div className="flex items-center justify-center gap-4 mt-8" variants={itemVariants}>
              <motion.div className={`flex items-center text-xs px-3 py-2 rounded-full transition-all duration-300 border ${
                theme === 'light' 
                  ? 'text-slate-600 bg-slate-50/90 shadow border-slate-200/80' 
                  : 'text-slate-400 bg-slate-800/50 border-slate-700/50'
              }`} whileHover={{ scale: 1.05, y: -2 }}>
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                Conexión segura
              </motion.div>
              <div className={`w-1 h-1 rounded-full ${
                theme === 'light' ? 'bg-slate-400' : 'bg-slate-600'
              }`}></div>
              <motion.div className={`flex items-center text-xs px-3 py-2 rounded-full transition-all duration-300 border ${
                theme === 'light' 
                  ? 'text-slate-600 bg-slate-50/90 shadow border-slate-200/80' 
                  : 'text-slate-400 bg-slate-800/50 border-slate-700/50'
              }`} whileHover={{ scale: 1.05, y: -2 }}>
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                Datos protegidos
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default LoginPage
