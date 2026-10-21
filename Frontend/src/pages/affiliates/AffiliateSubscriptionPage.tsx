import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, CalendarClock, CreditCard, Loader2, Receipt, Save, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { useAuth } from '../../contexts/AuthContext'
import { requestCardToken } from '../../lib/culqiCheckout'
import { getAffiliateAccount, payAffiliateByCard, updateAffiliateIdentity } from '../../services/affiliateService'

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })
const date = new Intl.DateTimeFormat('es-PE', { dateStyle: 'long', timeStyle: 'short' })

export default function AffiliateSubscriptionPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['affiliate-account'], queryFn: getAffiliateAccount })
  const [businessName, setBusinessName] = useState('')
  const [logo, setLogo] = useState<File | undefined>()
  const [preview, setPreview] = useState<string | null>(null)
  useEffect(() => { if (data?.business.nombre_comercial) setBusinessName(data.business.nombre_comercial) }, [data?.business.nombre_comercial])
  const identity = useMutation({ mutationFn: () => updateAffiliateIdentity(businessName, logo), onSuccess: () => { toast.success('Identidad de negocio actualizada'); setLogo(undefined); qc.invalidateQueries({ queryKey: ['affiliate-account'] }) }, onError: (error: any) => toast.error(error.response?.data?.error || 'No se pudo guardar la identidad') })
  const selectLogo = async (file?: File) => {
    if (!file) return
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) return toast.error('Usa PNG, JPG o WEBP de hasta 2 MB')
    const image = new Image(); const url = URL.createObjectURL(file)
    image.onload = () => { if (image.width < 256 || image.height < 256) { URL.revokeObjectURL(url); toast.error('El logo debe medir al menos 256 × 256 px'); return } if (preview) URL.revokeObjectURL(preview); setLogo(file); setPreview(url) }
    image.onerror = () => { URL.revokeObjectURL(url); toast.error('No se pudo leer la imagen') }; image.src = url
  }

  const pay = async (id: number, amount: number) => {
    try {
      const token = await requestCardToken(amount, user?.email || '', data?.culqi_public_key)
      await payAffiliateByCard(id, token)
      toast.success('Pago Culqi confirmado y suscripción activa')
      qc.invalidateQueries({ queryKey: ['affiliate-account'] })
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'No se pudo pagar')
    }
  }

  if (isLoading) return <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  if (!data) return null

  const trialEnd = data.business.prueba_finaliza_en ? new Date(data.business.prueba_finaliza_en) : null
  const trialActive = Boolean(trialEnd && trialEnd > new Date())
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) : 0
  const apiOrigin = String(import.meta.env.VITE_API_URL || window.location.origin).replace(/\/api\/?$/, '')
  const currentLogo = preview || (data.business.logo_url ? `${apiOrigin}${data.business.logo_url}` : null)

  return <div className="space-y-5">
    <div className="rounded-2xl bg-gradient-to-r from-slate-950 via-cyan-950 to-slate-950 p-6 text-white">
      <h1 className="text-2xl font-bold">Identidad y suscripción de mi negocio</h1>
      <p className="text-cyan-100/80">{data.business.nombre_comercial} · Estado: {data.business.estado}</p>
    </div>

    <Card className={!data.business.identidad_configurada ? 'border-2 border-amber-500' : ''}>
      <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5"/>Logo y nombre del afiliado</CardTitle></CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-[10rem_1fr]">
        <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl border bg-white p-3 shadow-sm">{currentLogo ? <img src={currentLogo} alt={businessName} className="h-full w-full object-contain"/> : <Building2 className="h-16 w-16 text-slate-300"/>}</div>
        <div className="space-y-4"><div><p className="mb-1 text-sm font-medium">Nombre comercial *</p><Input minLength={3} maxLength={120} value={businessName} onChange={event => setBusinessName(event.target.value)} placeholder="Nombre visible de tu tienda"/></div>
          <div><p className="mb-1 text-sm font-medium">Logo {data.business.identidad_configurada ? '(opcional para reemplazar)' : '*'}</p><label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 hover:bg-muted"><Upload className="h-5 w-5"/><span>Seleccionar PNG, JPG o WEBP</span><input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event => void selectLogo(event.target.files?.[0])}/></label><p className="mt-2 text-xs text-muted-foreground">Recomendado: 512 × 512 px, mínimo 256 × 256 px y máximo 2 MB. El sistema lo encaja en 160 × 160 px sin recortar ni deformar.</p></div>
          {!data.business.identidad_configurada && <p className="rounded-lg bg-amber-100 p-3 text-sm text-amber-900">Configuración inicial obligatoria: define la identidad antes de continuar administrando tu negocio.</p>}
          <Button disabled={identity.isPending || businessName.trim().length < 3 || (!data.business.identidad_configurada && !logo)} onClick={() => identity.mutate()}><Save className="mr-2 h-4 w-4"/>{identity.isPending ? 'Guardando…' : 'Guardar identidad'}</Button>
        </div>
      </CardContent>
    </Card>

    {trialActive && <Card className="border-cyan-500/30 bg-cyan-500/5">
      <CardContent className="flex gap-3 p-5">
        <CalendarClock className="mt-0.5 h-5 w-5 text-cyan-600" />
        <div>
          <p className="font-semibold">Prueba gratuita activa · {daysLeft} días restantes</p>
          <p className="text-sm text-muted-foreground">No se cobra comisión ni se suspende el punto de venta hasta {date.format(trialEnd!)}.</p>
        </div>
      </CardContent>
    </Card>}

    <div className="grid gap-4">
      {data.settlements.map(item => <Card key={item.id_settlement}>
        <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" />Liquidación {item.periodo}</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p>Facturación cobrable: {money.format(Number(item.facturacion_valida))}</p>
            <p className="font-semibold">Comisión: {money.format(Number(item.monto_comision))}</p>
            <p className="text-sm text-muted-foreground">Estado: {item.estado}</p>
          </div>
          {item.estado !== 'pagado' && <Button onClick={() => pay(item.id_settlement, Number(item.monto_comision))}>
            <CreditCard className="mr-2 h-4 w-4" />Pagar con Culqi
          </Button>}
        </CardContent>
      </Card>)}
      {data.settlements.length === 0 && <Card><CardContent className="p-6 text-muted-foreground">
        {trialActive ? 'No habrá liquidaciones durante la prueba gratuita.' : 'Todavía no existen liquidaciones mensuales.'}
      </CardContent></Card>}
    </div>
  </div>
}
