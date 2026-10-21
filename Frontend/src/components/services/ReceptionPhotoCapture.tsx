import { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, RefreshCw, Trash2, X } from 'lucide-react'
import { Button } from '../ui/button'

const MAX_PHOTOS = 12
const MAX_BYTES = 10 * 1024 * 1024

export function ReceptionPhotoCapture({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setCameraOpen(false)
  }

  useEffect(() => () => streamRef.current?.getTracks().forEach(track => track.stop()), [])

  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter(file => file.type.startsWith('image/') && file.size <= MAX_BYTES)
    onChange([...files, ...valid].slice(0, MAX_PHOTOS))
  }

  const openCamera = async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      streamRef.current = stream
      setCameraOpen(true)
      window.setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream }, 0)
    } catch {
      setCameraError('No se pudo abrir la cámara. Revisa el permiso del navegador o usa “Elegir fotos”.')
    }
  }

  const takePhoto = () => {
    const video = videoRef.current
    if (!video?.videoWidth || !video.videoHeight) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      addFiles([new File([blob], `recepcion-${Date.now()}.jpg`, { type: 'image/jpeg' })])
    }, 'image/jpeg', 0.9)
  }

  return <div className="space-y-3 rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 sm:col-span-2">
    <div><p className="font-semibold">Evidencia fotográfica de recepción</p><p className="text-xs text-muted-foreground">Toma o selecciona hasta {MAX_PHOTOS} fotos. Se guardarán privadas dentro del expediente.</p></div>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={openCamera} disabled={cameraOpen || files.length >= MAX_PHOTOS}><Camera className="mr-2 h-4 w-4"/>Abrir cámara</Button>
      <Button type="button" variant="outline" asChild><label className="cursor-pointer"><ImagePlus className="mr-2 h-4 w-4"/>Elegir fotos<input className="sr-only" type="file" accept="image/*" multiple onChange={event => { addFiles(Array.from(event.target.files || [])); event.target.value = '' }}/></label></Button>
    </div>
    {cameraError && <p className="text-sm text-destructive">{cameraError}</p>}
    {cameraOpen && <div className="space-y-2 rounded-xl bg-slate-950 p-3"><video ref={videoRef} autoPlay muted playsInline className="max-h-80 w-full rounded-lg object-contain"/><div className="flex justify-center gap-2"><Button type="button" onClick={takePhoto}><Camera className="mr-2 h-4 w-4"/>Capturar</Button><Button type="button" variant="secondary" onClick={stopCamera}><X className="mr-2 h-4 w-4"/>Cerrar cámara</Button></div></div>}
    {files.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{files.map((file, index) => <PhotoPreview key={`${file.name}-${file.lastModified}-${index}`} file={file} onRemove={() => onChange(files.filter((_, current) => current !== index))}/>)}</div>}
    <p className="flex items-center gap-1 text-xs text-muted-foreground"><RefreshCw className="h-3 w-3"/>{files.length}/{MAX_PHOTOS} fotos preparadas · máximo 10 MB por foto.</p>
  </div>
}

function PhotoPreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState('')
  useEffect(() => { const next = URL.createObjectURL(file); setUrl(next); return () => URL.revokeObjectURL(next) }, [file])
  return <div className="group relative aspect-square overflow-hidden rounded-lg border bg-background">{url && <img src={url} alt={file.name} className="h-full w-full object-cover"/>}<button type="button" aria-label={`Eliminar ${file.name}`} onClick={onRemove} className="absolute right-1 top-1 rounded-full bg-black/70 p-1.5 text-white"><Trash2 className="h-4 w-4"/></button></div>
}
