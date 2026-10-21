import api from '../lib/api'

export interface SocialLinks {
  instagram_url: string
  facebook_url: string
  tiktok_url: string
  youtube_url: string
  whatsapp_number: string
}

export const getSocialLinks = async (): Promise<SocialLinks> => (await api.get('/social-links/admin')).data
export const updateSocialLinks = async (links: SocialLinks): Promise<SocialLinks> => (await api.patch('/social-links/admin', links)).data
