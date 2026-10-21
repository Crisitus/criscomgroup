"use client"

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Formik, Form, Field, ErrorMessage } from "formik"
import * as Yup from "yup"
import { FaUser, FaLock, FaShieldAlt } from "react-icons/fa"
import { useAuth } from "@/hooks/useAuth"
import { motion } from "framer-motion"

const LoginSchema = Yup.object().shape({
  email: Yup.string().email("Email inválido").required("El email es requerido"),
  password: Yup.string().required("La contraseña es requerida"),
})

// Variantes para animaciones
const containerVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delayChildren: 0.2,
      staggerChildren: 0.1,
      type: "spring",
      stiffness: 100,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4 },
  },
}

const floatingVariants = {
  initial: { y: 0 },
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
}

const Login = () => {
  const { login, isAuthenticated } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/admin'

  useEffect(() => {
    if (isAuthenticated) {
      router.push(redirect)
    }
  }, [isAuthenticated, router, redirect])

  const handleSubmit = async (values: Record<string, unknown>, { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void }) => {
    try {
      const success = await login(values.email as string, values.password as string)
      if (success) {
        router.push(redirect)
      }
    } catch {
      console.error("Error de login")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-160px)] bg-gradient-to-br from-primary via-white to-primary dark:from-gray-950 dark:via-gray-900 dark:to-black relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <motion.div
          variants={floatingVariants}
          initial="initial"
          animate="animate"
          className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full filter blur-3xl"
        />
        <motion.div
          variants={floatingVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 1 }}
          className="absolute bottom-20 right-10 w-72 h-72 bg-fv-gold/20 rounded-full filter blur-3xl"
        />
        <motion.div
          variants={floatingVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 2 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full filter blur-3xl"
        />
      </div>

      {/* Contenedor principal */}
      <div className="relative z-10 flex justify-center items-center min-h-[calc(100vh-160px)] p-4 md:p-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-md"
        >
          {/* Card de Login */}
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {/* Header con gradiente */}
            <div className="relative bg-gradient-to-r from-primary to-fv-gold p-8 text-center">
              <motion.div
                variants={itemVariants}
                className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"
              />

              <motion.div
                variants={itemVariants}
                className="relative z-10"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/20 backdrop-blur-lg flex items-center justify-center shadow-xl">
                  <FaShieldAlt className="text-white text-4xl" />
                </div>

                <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
                  CRISCOM GROUP
                </h1>

                <p className="text-white/90 text-sm md:text-base font-medium">
                  Panel de Administración
                </p>
              </motion.div>

              {/* Decorative wave */}
              <div className="absolute bottom-0 left-0 right-0">
                <svg
                  viewBox="0 0 1440 120"
                  className="w-full h-auto"
                  preserveAspectRatio="none"
                >
                  <path
                    fill="currentColor"
                    fillOpacity="0.3"
                    d="M0,64L80,58.7C160,53,320,43,480,48C640,53,800,75,960,80C1120,85,1280,75,1360,69.3L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"
                    className="text-white dark:text-gray-900"
                  />
                </svg>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-8">
              <motion.div
                variants={itemVariants}
                className="mb-6 text-center"
              >
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Iniciar Sesión
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Ingresa tus credenciales para continuar
                </p>
              </motion.div>

              <Formik
                initialValues={{ email: "", password: "" }}
                validationSchema={LoginSchema}
                onSubmit={handleSubmit}
              >
                {({ isSubmitting, errors, touched }) => (
                  <Form className="space-y-6">
                    <motion.div variants={itemVariants}>
                      <label
                        htmlFor="email"
                        className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Correo Electrónico
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <FaUser className="text-lg" />
                        </div>
                        <Field
                          type="email"
                          name="email"
                          id="email"
                          placeholder="correo@criscomgroup.com.pe"
                          className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
                            errors.email && touched.email
                              ? "border-red-500 focus:ring-red-500"
                              : "border-gray-300 dark:border-gray-700 focus:ring-primary"
                          } bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400`}
                        />
                      </div>
                      <ErrorMessage
                        name="email"
                        component="div"
                        className="text-red-500 text-xs mt-1.5 ml-1"
                      />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <label
                        htmlFor="password"
                        className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Contraseña
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <FaLock className="text-lg" />
                        </div>
                        <Field
                          type="password"
                          name="password"
                          id="password"
                          placeholder="••••••••"
                          className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
                            errors.password && touched.password
                              ? "border-red-500 focus:ring-red-500"
                              : "border-gray-300 dark:border-gray-700 focus:ring-primary"
                          } bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400`}
                        />
                      </div>
                      <ErrorMessage
                        name="password"
                        component="div"
                        className="text-red-500 text-xs mt-1.5 ml-1"
                      />
                    </motion.div>

                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      variants={itemVariants}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-4 px-6 bg-gradient-to-r from-primary to-fv-gold text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:y-0 flex items-center justify-center gap-2 group"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Iniciando sesión...
                        </>
                      ) : (
                        <>
                          <FaShieldAlt className="text-xl transition-transform group-hover:rotate-12" />
                          Ingresar al Panel
                        </>
                      )}
                    </motion.button>
                  </Form>
                )}
              </Formik>

              {/* Security Badge */}
              <motion.div
                variants={itemVariants}
                className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800"
              >
                <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-xs">
                  <FaLock className="text-primary" />
                  <span>Conexión segura y encriptada</span>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Footer note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 text-center"
          >
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              ¿Problemas para acceder?{" "}
              <span className="text-primary font-semibold">
                Contacta al administrador
              </span>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Cargando...</div>}>
      <Login />
    </Suspense>
  )
}
