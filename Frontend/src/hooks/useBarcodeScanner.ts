import { useEffect, useRef, useState } from "react"

/**
 * useBarcodeScanner — Captura global de lectores de código de barras (HID / modo teclado).
 *
 * Los lectores tipo CBX (y la mayoría USB) emulan un teclado: "teclean" el código muy rápido
 * y terminan con Enter. Este hook distingue un escaneo (ráfaga de teclas veloz) de la escritura
 * humana normal, evita procesar duplicados inmediatos y no interfiere cuando el usuario escribe
 * en un input/textarea/select (salvo que se indique lo contrario).
 *
 * Fuente única de verdad para todo el ERP: reemplaza las implementaciones duplicadas por pantalla.
 */

export interface UseBarcodeScannerOptions {
  /** Callback cuando se detecta un código completo (tras Enter). */
  onScan: (code: string) => void
  /** Habilita/inhabilita la captura sin desmontar el componente. Default: true. */
  enabled?: boolean
  /**
   * Longitud mínima del código para considerarlo válido. Default: 4.
   * Evita falsos positivos con teclas sueltas.
   */
  minLength?: number
  /**
   * Máxima separación (ms) entre teclas para considerarlas parte del mismo escaneo.
   * Los lectores emiten <50 ms entre caracteres; un humano tarda mucho más. Default: 50.
   */
  interKeyTimeout?: number
  /**
   * Ventana (ms) para ignorar un escaneo idéntico repetido (rebote del lector). Default: 500.
   */
  duplicateTimeout?: number
  /**
   * Si es true, también captura cuando el foco está en un input/textarea/select.
   * Útil en pantallas de ingreso rápido; por defecto false para no pisar la escritura manual.
   */
  captureInsideInputs?: boolean
}

export interface UseBarcodeScannerResult {
  /** true durante el breve destello tras un escaneo exitoso (para feedback visual). */
  isScanning: boolean
  /** Último código detectado (útil para mostrarlo en la UI). */
  lastScanned: string
}

const CONTROL_KEYS = new Set(["Shift", "Tab", "CapsLock", "Escape", "Control", "Alt", "Meta"])

export function useBarcodeScanner(options: UseBarcodeScannerOptions): UseBarcodeScannerResult {
  const {
    onScan,
    enabled = true,
    minLength = 4,
    interKeyTimeout = 50,
    duplicateTimeout = 500,
    captureInsideInputs = false,
  } = options

  const [isScanning, setIsScanning] = useState(false)
  const [lastScanned, setLastScanned] = useState("")

  // Guardamos el callback en un ref para no re-suscribir el listener en cada render.
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (!enabled) return

    let buffer = ""
    let lastKeyTime = 0
    let lastProcessedCode = ""
    let lastProcessedTime = 0
    let flashTimer: ReturnType<typeof setTimeout> | null = null

    const handleKeyDown = (e: KeyboardEvent) => {
      // No interferir con atajos.
      if (e.altKey || e.ctrlKey || e.metaKey) return

      // No pisar la escritura manual salvo que se pida explícitamente.
      if (!captureInsideInputs) {
        const target = e.target as HTMLElement | null
        if (
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement ||
          target?.isContentEditable
        ) {
          return
        }
      }

      const now = Date.now()

      // Si pasó demasiado tiempo desde la última tecla, el buffer previo era escritura humana:
      // lo descartamos y empezamos limpio.
      if (buffer !== "" && now - lastKeyTime > interKeyTimeout) {
        buffer = ""
      }
      lastKeyTime = now

      if (CONTROL_KEYS.has(e.key)) return

      if (e.key === "Enter") {
        const code = buffer.trim()
        buffer = ""

        if (code.length < minLength) return

        // Anti-duplicado: mismo código dentro de la ventana => ignorar.
        if (code === lastProcessedCode && now - lastProcessedTime < duplicateTimeout) {
          return
        }

        e.preventDefault()
        lastProcessedCode = code
        lastProcessedTime = now

        setLastScanned(code)
        setIsScanning(true)
        if (flashTimer) clearTimeout(flashTimer)
        flashTimer = setTimeout(() => setIsScanning(false), 1200)

        onScanRef.current(code)
        return
      }

      // Solo acumulamos caracteres imprimibles (longitud 1).
      if (e.key.length === 1) {
        buffer += e.key
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (flashTimer) clearTimeout(flashTimer)
    }
  }, [enabled, minLength, interKeyTimeout, duplicateTimeout, captureInsideInputs])

  return { isScanning, lastScanned }
}

export default useBarcodeScanner
