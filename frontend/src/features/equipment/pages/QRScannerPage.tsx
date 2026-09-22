import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import { toast } from 'sonner'
import {
  QrCode, Camera, CheckCircle2, AlertCircle, RefreshCw, ImageIcon,
} from 'lucide-react'
import { useImpersonation } from '../../../app/ImpersonationContext'
import { getEquipment, listEquipment } from '../../../services/equipmentService'
import { Button } from '../../../components/ui/button'
import PageHeader from '../../../components/PageHeader'

type ScanStatus =
  | 'starting' | 'scanning' | 'found' | 'error'
  | 'not_found' | 'no_camera' | 'upload_processing'

const navy = '#1A4889'

export default function QRScannerPage() {
  const navigate = useNavigate()
  const { effectiveRole } = useImpersonation()

  const [status, setStatus]               = useState<ScanStatus>('starting')
  const [statusMessage, setStatusMessage] = useState('Initializing camera…')

  const videoRef     = useRef<HTMLVideoElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const streamRef    = useRef<MediaStream | null>(null)
  const rafRef       = useRef<number | null>(null)
  const hasProcessed = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Stop camera helper ──────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null }
  }, [])

  // ── Navigate to equipment profile ───────────────────────────────────────────
  const navigateToEquipment = useCallback(
    (id: string) => {
      if (effectiveRole === 'admin') navigate(`/admin/equipment/${id}`)
      else if (effectiveRole === 'field') navigate(`/field/equipment/${id}`)
      else if (effectiveRole === 'maintenance') navigate(`/maintenance/equipment/${id}`)
      else navigate(`/admin/equipment/${id}`)
    },
    [effectiveRole, navigate],
  )

  // ── QR decode handler ───────────────────────────────────────────────────────
  const handleCode = useCallback(async (decodedText: string) => {
    if (hasProcessed.current) return
    hasProcessed.current = true

    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }

    setStatus('found')
    setStatusMessage('QR Code detected — looking up equipment…')

    // QR payloads in this system are asset tags (e.g. "EXC-001"), not IDs.
    // Try an asset-tag search first; only fall back to a silent getEquipment(id)
    // so we don't show a 404 toast when the search is the valid path.
    let equipment: Awaited<ReturnType<typeof getEquipment>> | null = null
    try {
      const results = await listEquipment({ search: decodedText })
      const exact = results.find(
        (r) => (r.qrCode ?? '').toLowerCase() === decodedText.toLowerCase(),
      )
      equipment = exact ?? results[0] ?? null
    } catch { /* search failed — try ID fallback silently */ }

    if (!equipment) {
      try {
        equipment = await getEquipment(decodedText, { silent: true })
      } catch { /* not found by ID either */ }
    }

    if (!equipment) {
      setStatus('not_found')
      setStatusMessage('No equipment found for this QR code. Try scanning again.')
      hasProcessed.current = false
      return
    }

    toast.success(`Found: ${equipment.name}`)
    navigateToEquipment(equipment.id)
  }, [navigateToEquipment])

  // ── Scan loop ───────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || hasProcessed.current) return

    if (video.readyState >= video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
      if (code?.data) { handleCode(code.data); return }
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [handleCode])

  // ── Start camera ────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    hasProcessed.current = false
    setStatus('starting')
    setStatusMessage('Initializing camera…')

    stopCamera()

    if (!window.isSecureContext) {
      setStatus('no_camera')
      setStatusMessage('Camera requires a secure connection (HTTPS). Use the photo upload option below instead.')
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('no_camera')
      setStatusMessage('Camera access is not available in this browser or context. Use the photo upload option below instead.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        await video.play()
        setStatus('scanning')
        setStatusMessage('Point your camera at an equipment QR code')
        rafRef.current = requestAnimationFrame(tick)
      }
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setStatus('no_camera')
        setStatusMessage('Camera permission denied. Allow camera access in your browser settings and try again, or use the photo upload option below.')
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setStatus('no_camera')
        setStatusMessage('No camera hardware found on this device. Use the photo upload option below instead.')
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setStatus('error')
        setStatusMessage('Camera is in use by another application. Close other apps using the camera and try again.')
      } else {
        setStatus('error')
        setStatusMessage('Could not start the camera. Try again, or use the photo upload option below.')
      }
    }
  }, [tick, stopCamera])

  // ── Photo upload fallback ───────────────────────────────────────────────────
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setStatus('upload_processing')
    setStatusMessage('Processing image — looking for QR code…')
    hasProcessed.current = false

    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const canvas = canvasRef.current
      if (!canvas) { setStatus('error'); setStatusMessage('Could not process the image. Please try again.'); return }

      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) { setStatus('error'); setStatusMessage('Could not read the image. Please try again.'); return }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      let code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
      if (!code) code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'invertFirst' })

      if (code?.data) {
        handleCode(code.data)
      } else {
        setStatus('not_found')
        setStatusMessage('No QR code detected in this photo. Make sure the QR code is clearly visible and try again.')
        hasProcessed.current = false
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      setStatus('error')
      setStatusMessage('Could not load the image file. Please try a different photo.')
    }

    img.src = objectUrl
  }, [handleCode])

  const triggerFileUpload = useCallback(() => { fileInputRef.current?.click() }, [])

  // ── Mount / unmount ─────────────────────────────────────────────────────────
  useEffect(() => {
    startCamera()
    return stopCamera
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Status bar config ───────────────────────────────────────────────────────
  const statusConfig: Record<ScanStatus, { bar: string; text: string; icon: React.ReactNode }> = {
    starting:         { bar: 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700', text: 'text-slate-600 dark:text-slate-400', icon: <QrCode className="h-4 w-4 shrink-0" /> },
    scanning:         { bar: 'bg-blue-50 border-blue-200',   text: 'text-blue-700',   icon: <Camera className="h-4 w-4 shrink-0 animate-pulse" /> },
    found:            { bar: 'bg-green-50 border-green-200', text: 'text-green-700',  icon: <CheckCircle2 className="h-4 w-4 shrink-0" /> },
    error:            { bar: 'bg-red-50 border-red-200',     text: 'text-red-700',    icon: <AlertCircle className="h-4 w-4 shrink-0" /> },
    not_found:        { bar: 'bg-amber-50 border-amber-200', text: 'text-amber-700',  icon: <AlertCircle className="h-4 w-4 shrink-0" /> },
    no_camera:        { bar: 'bg-red-50 border-red-200',     text: 'text-red-700',    icon: <AlertCircle className="h-4 w-4 shrink-0" /> },
    upload_processing:{ bar: 'bg-blue-50 border-blue-200',   text: 'text-blue-700',   icon: <ImageIcon className="h-4 w-4 shrink-0 animate-pulse" /> },
  }

  const cfg         = statusConfig[status]
  const showRetry   = status === 'error' || status === 'not_found'
  const cameraBlocked = status === 'no_camera'
  const isActive    = status === 'scanning' || status === 'starting'

  // ── Scanner mode ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="QR Code Scanner"
        subtitle="Scan an equipment QR code to instantly open its full profile"
      />

      <div className="max-w-lg mx-auto space-y-4">
        {/* Status bar */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium border ${cfg.bar} ${cfg.text}`}>
          {cfg.icon}
          <span>{statusMessage}</span>
        </div>

        {/* Camera viewport */}
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          <div className="relative bg-slate-900 overflow-hidden" style={{ minHeight: 340 }}>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="sr-only" aria-hidden="true" onChange={handleFileUpload} />

            {status === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white bg-slate-900">
                <QrCode className="h-14 w-14 opacity-20 animate-pulse" />
                <p className="text-sm text-white/50">Starting camera…</p>
              </div>
            )}

            {cameraBlocked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-slate-900 px-6">
                <AlertCircle className="h-10 w-10 text-red-400 opacity-70" />
                <p className="text-sm text-white/60 text-center leading-relaxed max-w-xs">{statusMessage}</p>
                <Button onClick={triggerFileUpload} className="gap-2 mt-1" style={{ backgroundColor: navy }}>
                  <ImageIcon className="h-4 w-4" />
                  Upload a Photo Instead
                </Button>
                <button onClick={startCamera} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors">
                  <RefreshCw className="h-3 w-3" />
                  Try camera again
                </button>
              </div>
            )}

            {showRetry && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900 px-6">
                <AlertCircle className="h-12 w-12 text-red-400 opacity-60" />
                <p className="text-sm text-white/60 text-center leading-relaxed">{statusMessage}</p>
              </div>
            )}

            {status === 'upload_processing' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900">
                <ImageIcon className="h-14 w-14 text-blue-300 opacity-50 animate-pulse" />
                <p className="text-sm text-white/50">Scanning image for QR code…</p>
              </div>
            )}

            {status === 'scanning' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative" style={{ width: 260, height: 260 }}>
                  <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl" />
                  <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr" />
                  <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl" />
                  <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br" />
                </div>
              </div>
            )}

            {status === 'found' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-green-900/70">
                <CheckCircle2 className="h-14 w-14 text-green-300" />
                <p className="text-sm text-green-100 font-medium">Equipment found!</p>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {(showRetry || isActive) && (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {showRetry && (
              <Button onClick={startCamera} style={{ backgroundColor: navy }} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            {(showRetry || isActive) && (
              <Button onClick={triggerFileUpload} variant="outline" className="gap-2 text-slate-600 border-slate-300 hover:bg-slate-50">
                <ImageIcon className="h-4 w-4" />
                Upload a Photo
              </Button>
            )}
          </div>
        )}

        {status === 'scanning' && (
          <div className="flex justify-center">
            <button onClick={triggerFileUpload} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors py-1">
              <ImageIcon className="h-3.5 w-3.5" />
              Or upload a photo of a QR code
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 dark:bg-slate-700/50 dark:border-slate-700 px-4 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <QrCode className="h-3.5 w-3.5" />
              After scanning
            </p>
          </div>
          <div className="p-4 space-y-2.5">
            {[
              { icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />, text: "You'll be taken directly to the equipment's full profile page" },
              { icon: <Camera className="h-3.5 w-3.5 text-blue-500" />, text: 'From there you can request the equipment, file an issue report, or view service history' },
              { icon: <QrCode className="h-3.5 w-3.5 text-slate-400" />, text: 'All available actions are shown based on your role' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                <span className="shrink-0">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-3 mt-3 flex items-start gap-2">
              <ImageIcon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                No camera?{' '}
                <button onClick={triggerFileUpload} className="underline underline-offset-2 hover:text-slate-600 transition-colors">
                  Upload a photo
                </button>{' '}
                of the QR code from your camera roll instead.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
