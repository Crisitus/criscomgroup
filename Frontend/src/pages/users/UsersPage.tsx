"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  User,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react"
import { Button } from "../../components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input } from "../../components/ui/input"
import { motion } from "framer-motion"
import { useDocumentTitle } from "../../hooks/useDocumentTitle"
import { useAuth } from "../../contexts/AuthContext"
import { Navigate } from "react-router-dom"
import * as userService from "../../services/userService"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog"

// Esquema de validación para el formulario de usuario con contraseña mejorada
const userCreateSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Ingrese un correo electrónico válido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "La contraseña debe contener al menos una letra mayúscula")
    .regex(/[0-9]/, "La contraseña debe contener al menos un número")
    .regex(/[^A-Za-z0-9]/, "La contraseña debe contener al menos un carácter especial"),
  id_role: z.coerce.number().min(1, "El rol es requerido"),
})

// Esquema para actualización donde la contraseña es opcional
const userUpdateSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Ingrese un correo electrónico válido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, "La contraseña debe contener al menos una letra mayúscula")
    .regex(/[0-9]/, "La contraseña debe contener al menos un número")
    .regex(/[^A-Za-z0-9]/, "La contraseña debe contener al menos un carácter especial")
    .optional()
    .or(z.literal("")),
  id_role: z.coerce.number().min(1, "El rol es requerido"),
})

type UserCreateFormValues = z.infer<typeof userCreateSchema>
type UserUpdateFormValues = z.infer<typeof userUpdateSchema>

const UsersPage = () => {
  useDocumentTitle("Gestión de Usuarios")

  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    number: false,
    special: false,
  })

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  const queryClient = useQueryClient()

  // Verificar si el usuario tiene permisos de administrador
  const isAdmin = user?.id_role === 1 && user.email?.trim().toLowerCase() === "cristophercalioro@gmail.com"
  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: userService.fetchUsers,
    enabled: isAdmin, // Solo ejecutar la consulta si es administrador
  })
  // Create user mutation
  const createMutation = useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("Usuario creado exitosamente")
      setIsCreateDialogOpen(false)
      createForm.reset()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || error.response?.data?.message || "Error al crear el usuario")
    },
  })
  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: userService.updateUserWithPayload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("Usuario actualizado exitosamente")
      setIsUpdateDialogOpen(false)
      setEditingUser(null)
      updateForm.reset()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al actualizar el usuario")
    },
  })

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: userService.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("Usuario eliminado exitosamente")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al eliminar el usuario")
    },
  })

  // Form for creating a new user
  const createForm = useForm<UserCreateFormValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      id_role: 3, // Por defecto, rol de vendedor
    },
  })
  const createPassword = createForm.watch("password")

  // Form for updating a user
  const updateForm = useForm<UserUpdateFormValues>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      id_role: 2,
    },
  })

  // Validate password as user types in create form
  useEffect(() => {
    setPasswordValidation({
      length: createPassword.length >= 8,
      uppercase: /[A-Z]/.test(createPassword),
      number: /[0-9]/.test(createPassword),
      special: /[^A-Za-z0-9]/.test(createPassword),
    })
  }, [createPassword])

  // Set form values when editing user
  useEffect(() => {
    if (editingUser) {
      updateForm.reset({
        name: editingUser.name,
        email: editingUser.email,
        password: "", // Dejamos la contraseña vacía para no sobrescribirla si no se cambia
        id_role: editingUser.id_role,
      })
    }
  }, [editingUser, updateForm])

  const onCreateSubmit = (data: UserCreateFormValues) => {
    createMutation.mutate(data)
  }

  const onUpdateSubmit = (data: UserUpdateFormValues) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id_user, data })
    }
  }
  // Filter users based on search term
  const filteredUsers = users?.filter(
    (user: any) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Paginación
  const totalPages = filteredUsers ? Math.ceil(filteredUsers.length / itemsPerPage) : 0
  const paginatedUsers = filteredUsers?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const startItem = filteredUsers && filteredUsers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
  const endItem = filteredUsers ? Math.min(currentPage * itemsPerPage, filteredUsers.length) : 0
  const totalItems = filteredUsers?.length || 0

  // Funciones de navegación
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleEditUser = (userData: any) => {
    setEditingUser(userData)
    setIsUpdateDialogOpen(true)
  }

  const handleDeleteUser = (id: number) => {
    setDeletingUserId(id)
    setShowDeleteDialog(true)
  }

  const confirmDelete = () => {
    if (deletingUserId) {
      deleteMutation.mutate(deletingUserId)
      setShowDeleteDialog(false)
      setDeletingUserId(null)
    }
  }

  // Modificar la función getRoleName para reflejar los nuevos roles
  const getRoleName = (roleId: number) => {
    switch (roleId) {
      case 1:
        return "Gerente"
      case 2:
        return "Administrador"
      case 3:
        return "Vendedor"
      case 4:
        return "No Autorizado"
      default:
        return "Desconocido"
    }
  }

  // Modificar la verificación de permisos para el acceso a la página
  const isManager = user?.id_role === 1 && user.email?.trim().toLowerCase() === "cristophercalioro@gmail.com"

  if (!isManager) {
    return <Navigate to="/" />
  }  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >          <motion.div
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/50 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-border/20"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Gestión de Usuarios
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Administra los usuarios del sistema y sus roles
              </p>
            </div><Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105" 
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Usuario
                </Button>
              </DialogTrigger>            <DialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-2xl rounded-2xl max-w-md p-0 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 dark:from-purple-400 dark:via-indigo-400 dark:to-blue-400" />
              
              <DialogHeader className="p-6 pb-4">
                <div className="mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center mx-auto shadow-lg">
                  <User className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <DialogTitle className="text-xl text-center font-semibold text-gray-900 dark:text-gray-100">
                  Crear Nuevo Usuario
                </DialogTitle>
                <DialogDescription className="text-center text-gray-600 dark:text-gray-300">
                  Completa el formulario para crear un nuevo usuario
                </DialogDescription>
              </DialogHeader>              <div className="p-6 space-y-6">
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                    {/* Primera fila: Nombre y Correo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Nombre completo" 
                                {...field} 
                                className="h-11 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-sm focus:shadow-md focus:border-purple-300 dark:focus:border-purple-600 transition-all duration-200" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="usuario@ejemplo.com" 
                                {...field} 
                                className="h-11 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-sm focus:shadow-md focus:border-purple-300 dark:focus:border-purple-600 transition-all duration-200" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Segunda fila: Contraseña y Rol */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Contraseña</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Mínimo 8 caracteres"
                                {...field}
                                className="h-11 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-sm focus:shadow-md focus:border-purple-300 dark:focus:border-purple-600 transition-all duration-200"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="id_role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Rol</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(Number.parseInt(value))}
                              defaultValue={field.value.toString()}
                            >
                              <FormControl>
                                <SelectTrigger className="h-11 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                                  <SelectValue placeholder="Seleccionar rol" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-gray-200/80 dark:border-gray-700/80 shadow-xl rounded-xl">
                                <SelectItem value="1">Gerente</SelectItem>
                                <SelectItem value="2">Administrador</SelectItem>
                                <SelectItem value="3">Vendedor</SelectItem>
                                <SelectItem value="4">No Autorizado</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Requisitos de contraseña */}
                    <div className="bg-gradient-to-br from-gray-50/80 to-purple-50/40 dark:from-gray-800/80 dark:to-purple-900/20 backdrop-blur-sm p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                      <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Requisitos de contraseña:</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`flex items-center text-xs transition-colors ${passwordValidation.length ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400"}`}>
                          {passwordValidation.length ? (
                            <CheckCircle size={16} className="text-emerald-500 mr-2 flex-shrink-0" />
                          ) : (
                            <XCircle size={16} className="text-gray-400 mr-2 flex-shrink-0" />
                          )}
                          <span>Mínimo 8 caracteres</span>
                        </div>
                        <div className={`flex items-center text-xs transition-colors ${passwordValidation.uppercase ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400"}`}>
                          {passwordValidation.uppercase ? (
                            <CheckCircle size={16} className="text-emerald-500 mr-2 flex-shrink-0" />
                          ) : (
                            <XCircle size={16} className="text-gray-400 mr-2 flex-shrink-0" />
                          )}
                          <span>Una mayúscula</span>
                        </div>
                        <div className={`flex items-center text-xs transition-colors ${passwordValidation.number ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400"}`}>
                          {passwordValidation.number ? (
                            <CheckCircle size={16} className="text-emerald-500 mr-2 flex-shrink-0" />
                          ) : (
                            <XCircle size={16} className="text-gray-400 mr-2 flex-shrink-0" />
                          )}
                          <span>Un número</span>
                        </div>
                        <div className={`flex items-center text-xs transition-colors ${passwordValidation.special ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400"}`}>
                          {passwordValidation.special ? (
                            <CheckCircle size={16} className="text-emerald-500 mr-2 flex-shrink-0" />
                          ) : (
                            <XCircle size={16} className="text-gray-400 mr-2 flex-shrink-0" />
                          )}
                          <span>Un carácter especial</span>
                        </div>
                      </div>
                    </div>
                  </form>
                </Form>
              </div>
              
              <DialogFooter className="flex justify-center space-x-3 p-6 pt-2 border-t border-gray-200/80 dark:border-gray-700/80">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-gray-800 dark:text-gray-200 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm hover:shadow-md rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 dark:from-purple-600 dark:to-indigo-700 dark:hover:from-purple-700 dark:hover:to-indigo-800 border-0 shadow-md hover:shadow-lg transition-all duration-200 text-white rounded-xl"
                  disabled={createMutation.isPending}
                  onClick={createForm.handleSubmit(onCreateSubmit)}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    "Crear Usuario"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </motion.div>        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/80 dark:border-gray-700/80 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-purple-50/30 dark:to-purple-900/20" />
            <CardHeader className="pb-3 relative">
              <CardTitle className="text-xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                Lista de Usuarios
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Administra los usuarios y sus permisos en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="flex items-center mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    type="search"
                    placeholder="Buscar usuarios por nombre o email..."
                    className="pl-10 h-11 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-sm focus:shadow-md focus:border-purple-300 dark:focus:border-purple-600 transition-all duration-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>              {isLoading ? (
                <div className="flex justify-center py-16">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center mx-auto shadow-lg">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Cargando usuarios...</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Obteniendo la información de usuarios</p>
                  </div>
                </div>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                <div className="rounded-xl border border-gray-200/80 dark:border-gray-700/80 overflow-hidden shadow-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
                  <Table>
                    <TableHeader className="bg-gradient-to-r from-gray-50 to-purple-50/30 dark:from-gray-800 dark:to-purple-900/20">
                      <TableRow className="border-gray-200/80 dark:border-gray-700/80">
                        <TableHead className="text-center font-semibold text-gray-700 dark:text-gray-300">ID</TableHead>
                        <TableHead className="text-center font-semibold text-gray-700 dark:text-gray-300">Nombre</TableHead>
                        <TableHead className="text-center font-semibold text-gray-700 dark:text-gray-300">Correo</TableHead>
                        <TableHead className="text-center font-semibold text-gray-700 dark:text-gray-300">Rol</TableHead>
                        <TableHead className="text-center font-semibold text-gray-700 dark:text-gray-300">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUsers?.map((user: any, index: number) => (
                        <motion.tr
                          key={user.id_user}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.05 * index }}
                          className="group transition-all duration-200 hover:bg-gradient-to-r hover:from-gray-50/80 hover:to-purple-50/30 dark:hover:from-gray-800/50 dark:hover:to-purple-900/20"
                        >
                          <TableCell className="text-center font-medium text-gray-900 dark:text-gray-100">
                            <div className="flex items-center justify-center">
                              <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full text-sm font-mono">
                                {user.id_user}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-gray-900 dark:text-gray-100 font-medium">{user.name}</TableCell>
                          <TableCell className="text-center text-gray-600 dark:text-gray-400">{user.email}</TableCell>
                          <TableCell className="text-center">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              user.id_role === 1 
                                ? "bg-gradient-to-r from-red-100 to-pink-100 text-red-700 dark:from-red-900/30 dark:to-pink-900/30 dark:text-red-300"
                                : user.id_role === 2
                                ? "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-300"
                                : user.id_role === 3
                                ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-300"
                                : "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 dark:from-gray-900/30 dark:to-slate-900/30 dark:text-gray-300"
                            }`}>
                              {getRoleName(user.id_role)}
                            </span>
                          </TableCell>
                          <TableCell align="center">
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditUser(user)}
                                className="h-8 w-8 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 rounded-lg shadow-sm hover:shadow-md"
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Editar</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteUser(user.id_user)}
                                disabled={deleteMutation.isPending || user.id_user === user?.id}
                                className="h-8 w-8 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 rounded-lg shadow-sm hover:shadow-md"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Eliminar</span>
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>              ) : (
                <motion.div
                  className="flex flex-col items-center justify-center py-16 text-center bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/80 dark:border-gray-700/80"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-6 shadow-lg">
                    <User className="h-10 w-10 text-purple-500 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No hay usuarios</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                    {searchTerm
                      ? "No se encontraron usuarios con ese término de búsqueda"
                      : "Comienza creando tu primer usuario para gestionar el sistema"}
                  </p>
                  {!searchTerm && (
                    <Button 
                      onClick={() => setIsCreateDialogOpen(true)} 
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Nuevo Usuario
                    </Button>
                  )}
                  {searchTerm && (
                    <Button
                      variant="outline"
                      onClick={() => setSearchTerm("")}
                      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                    >
                      Limpiar búsqueda
                    </Button>
                  )}
                </motion.div>
              )}
              
              {/* Paginación mejorada */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200/80 dark:border-gray-700/80">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Mostrando {startItem} a {endItem} de {totalItems} usuarios
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPrevPage}
                      disabled={currentPage === 1}
                      className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-3 py-1 bg-gray-100/80 dark:bg-gray-700/80 rounded-lg backdrop-blur-sm">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>      {/* Modal de edición de usuario */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-2xl rounded-2xl max-w-md p-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 dark:from-purple-400 dark:via-indigo-400 dark:to-blue-400" />
          
          <DialogHeader className="p-6 pb-4">
            <div className="mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center mx-auto shadow-lg">
              <Edit className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-xl text-center font-semibold text-gray-900 dark:text-gray-100">
              Editar Usuario
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600 dark:text-gray-300">
              Actualiza la información del usuario
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 space-y-4">
            <Form {...updateForm}>
              <form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="space-y-4">
                <FormField
                  control={updateForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nombre del usuario" 
                          {...field} 
                          className="h-11 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-sm focus:shadow-md focus:border-amber-300 dark:focus:border-amber-600 transition-all duration-200" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={updateForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="correo@ejemplo.com" 
                          {...field} 
                          className="h-11 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-sm focus:shadow-md focus:border-amber-300 dark:focus:border-amber-600 transition-all duration-200" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={updateForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Contraseña (dejar vacío para mantener la actual)</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Nueva contraseña (opcional)"
                          {...field}
                          className="h-11 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-sm focus:shadow-md focus:border-amber-300 dark:focus:border-amber-600 transition-all duration-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={updateForm.control}
                  name="id_role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Rol</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number.parseInt(value))}
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                            <SelectValue placeholder="Seleccionar rol" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-gray-200/80 dark:border-gray-700/80 shadow-xl rounded-xl">
                          <SelectItem value="1">Gerente</SelectItem>
                          <SelectItem value="2">Administrador</SelectItem>
                          <SelectItem value="3">Vendedor</SelectItem>
                          <SelectItem value="4">No Autorizado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
          
          <DialogFooter className="flex justify-center space-x-3 p-6 pt-2 border-t border-gray-200/80 dark:border-gray-700/80">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsUpdateDialogOpen(false)}
              className="border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-gray-800 dark:text-gray-200 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm hover:shadow-md rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 dark:from-amber-600 dark:to-orange-700 dark:hover:from-amber-700 dark:hover:to-orange-800 border-0 shadow-md hover:shadow-lg transition-all duration-200 text-white rounded-xl"
              disabled={updateMutation.isPending}
              onClick={updateForm.handleSubmit(onUpdateSubmit)}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                "Actualizar Usuario"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-0 shadow-2xl rounded-2xl max-w-md p-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 dark:from-red-400 dark:via-pink-400 dark:to-rose-400" />
          
          <AlertDialogHeader className="p-6 pb-4">
            <div className="mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 flex items-center justify-center mx-auto shadow-lg">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <AlertDialogTitle className="text-xl text-center font-semibold text-gray-900 dark:text-gray-100">
              Eliminar usuario
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-gray-600 dark:text-gray-300">
              ¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter className="flex justify-center space-x-3 p-6 pt-2">
            <AlertDialogCancel
              onClick={() => setShowDeleteDialog(false)}
              className="border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 text-gray-800 dark:text-gray-200 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm hover:shadow-md rounded-xl"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 dark:from-red-600 dark:to-pink-700 dark:hover:from-red-700 dark:hover:to-pink-800 border-0 shadow-md hover:shadow-lg transition-all duration-200 text-white rounded-xl"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  )
}

export default UsersPage
