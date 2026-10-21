import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";

type ScannerControls = { stop: () => void };

export function CameraCodeScanner({
  onDetected,
  label = "Escanear con cámara",
  className,
}: {
  onDetected: (code: string) => void | Promise<void>;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<ScannerControls | null>(null);
  const detectedRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const close = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setOpen(false);
    setStarting(false);
  };

  useEffect(() => {
    if (!open || !videoRef.current) return;
    let active = true;
    detectedRef.current = false;
    setStarting(true);
    void import("@zxing/browser").then(({ BrowserMultiFormatReader }) => {
      if (!active || !videoRef.current) return undefined;
      const reader = new BrowserMultiFormatReader();
      return reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        videoRef.current,
        async (result, _error, controls) => {
          controlsRef.current = controls;
          if (!result || detectedRef.current) return;
          detectedRef.current = true;
          const value = result.getText().trim();
          controls.stop();
          setOpen(false);
          if (value) await onDetectedRef.current(value);
        },
      );
    })
      .then((controls) => {
        if (!controls) return;
        if (!active) controls.stop();
        else controlsRef.current = controls;
      })
      .catch((error) => {
        console.error("No se pudo iniciar el escáner", error);
        toast.error("No se pudo abrir la cámara. Revisa el permiso del navegador y usa HTTPS.");
        setOpen(false);
      })
      .finally(() => setStarting(false));

    return () => {
      active = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open]);

  return (
    <>
      <Button type="button" variant="outline" className={className} onClick={() => setOpen(true)}>
        <Camera className="mr-2 h-4 w-4" />
        {label}
      </Button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Escáner de códigos">
          <div className="w-full max-w-lg space-y-4 rounded-2xl border bg-background p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div><p className="font-semibold">Escanear QR o código de barras</p><p className="text-xs text-muted-foreground">Centra el código dentro de la cámara.</p></div>
              <Button type="button" size="icon" variant="ghost" onClick={close} aria-label="Cerrar escáner"><X className="h-5 w-5" /></Button>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-black aspect-[4/3]">
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
              {starting && <div className="absolute inset-0 flex items-center justify-center text-white"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Abriendo cámara…</div>}
              <div className="pointer-events-none absolute inset-[15%] rounded-xl border-2 border-cyan-400 shadow-[0_0_0_9999px_rgba(0,0,0,.18)]" />
            </div>
            <p className="text-xs text-muted-foreground">Compatible con QR, EAN, UPC, Code 128 y otros formatos habituales. En una laptop puedes elegir su webcam.</p>
          </div>
        </div>
      )}
    </>
  );
}
