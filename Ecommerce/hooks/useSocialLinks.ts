"use client"

import { useEffect, useState } from 'react'
import { getConfigPublica, type ConfigPublica } from '@/services/configPublicaService'

export interface SocialLinks {
  instagram_url: string
  facebook_url: string
  tiktok_url: string
  youtube_url: string
  whatsapp_number: string
}

// Sin fallbacks hardcodeados: si el backend no tiene el dato, queda vacío
// y la UI lo oculta (ecom-logica T1).
export const EMPTY_SOCIAL_LINKS: SocialLinks = {
  instagram_url: '',
  facebook_url: '',
  tiktok_url: '',
  youtube_url: '',
  whatsapp_number: '',
}

const toSocialLinks = (config: ConfigPublica | null): SocialLinks => ({
  instagram_url: config?.redes?.instagram_url || '',
  facebook_url: config?.redes?.facebook_url || '',
  tiktok_url: config?.redes?.tiktok_url || '',
  youtube_url: config?.redes?.youtube_url || '',
  whatsapp_number: config?.whatsapp_number || '',
})

export const useSocialLinks = () => {
  const [links, setLinks] = useState(EMPTY_SOCIAL_LINKS)
  useEffect(() => {
    let active = true
    getConfigPublica().then(config => {
      if (active) setLinks(toSocialLinks(config))
    })
    return () => { active = false }
  }, [])
  return links
}

// Config pública completa (nombre comercial, dirección, horario, teléfono).
export const useConfigPublica = () => {
  const [config, setConfig] = useState<ConfigPublica | null>(null)
  useEffect(() => {
    let active = true
    getConfigPublica().then(data => { if (active) setConfig(data) })
    return () => { active = false }
  }, [])
  return config
}
