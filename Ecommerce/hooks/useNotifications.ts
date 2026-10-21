import { useState, useEffect, useCallback } from 'react'
import { claimService, contactService } from '../services/api'

export interface Notification {
  id: string
  type: 'claim' | 'contact'
  title: string
  time: string
  unread: boolean
  createdAt: Date
}

interface Claim {
  id: number
  nombre: string
  email: string
  telefono: string
  asunto: string
  mensaje: string
  created_at: string
  updated_at: string
}

interface Contact {
  id: number
  name: string
  email: string
  phone?: string
  message: string
  read_at: string | null
  created_at: string
  updated_at: string
}

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / 60000)
  const diffInHours = Math.floor(diffInMs / 3600000)
  const diffInDays = Math.floor(diffInMs / 86400000)

  if (diffInMinutes < 1) return 'Hace un momento'
  if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`
  if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`
  if (diffInDays < 7) return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`

  return date.toLocaleDateString('es-PE')
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [claimsResponse, contactsResponse] = await Promise.all([
        claimService.getAll().catch(() => ({ data: { data: [] } })),
        contactService.getAll().catch(() => ({ data: { data: [] } }))
      ])

      const claimsData: Claim[] = claimsResponse.data.data || claimsResponse.data || []
      const contactsData: Contact[] = contactsResponse.data.data || contactsResponse.data || []

      // Convertir claims a notificaciones
      const claimNotifications: Notification[] = claimsData.map((claim) => ({
        id: `claim-${claim.id}`,
        type: 'claim' as const,
        title: `Nueva reclamación: ${claim.asunto}`,
        time: formatTimeAgo(claim.created_at),
        unread: true, // Las reclamaciones siempre se consideran no leídas
        createdAt: new Date(claim.created_at)
      }))

      // Convertir contacts a notificaciones
      const contactNotifications: Notification[] = contactsData.map((contact) => ({
        id: `contact-${contact.id}`,
        type: 'contact' as const,
        title: `Nuevo contacto: ${contact.name}`,
        time: formatTimeAgo(contact.created_at),
        unread: !contact.read_at,
        createdAt: new Date(contact.created_at)
      }))

      // Combinar y ordenar por fecha (más reciente primero)
      const allNotifications = [...claimNotifications, ...contactNotifications]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10) // Limitar a las 10 más recientes

      setNotifications(allNotifications)
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError('Error al cargar notificaciones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()

    // Refrescar notificaciones cada 60 segundos
    const interval = setInterval(fetchNotifications, 60000)

    return () => clearInterval(interval)
  }, [fetchNotifications])

  const unreadCount = notifications.filter(n => n.unread).length

  const markContactAsRead = async (contactId: number) => {
    try {
      await contactService.markAsRead(contactId)
      // Refrescar notificaciones después de marcar como leída
      await fetchNotifications()
    } catch (err) {
      console.error('Error marking contact as read:', err)
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: fetchNotifications,
    markContactAsRead
  }
}
