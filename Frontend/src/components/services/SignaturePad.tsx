import { useEffect, useRef } from "react";
import { Button } from "../ui/button";

type Props = {
  onChange: (file: File | null) => void;
};

export function SignaturePad({ onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const ink = useRef(false);

  const prepareCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, rect.width, rect.height);
    context.strokeStyle = "#111827";
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";
  };

  useEffect(() => {
    prepareCanvas();
  }, []);

  const position = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = position(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    drawing.current = true;
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = position(event);
    context.lineTo(point.x, point.y);
    context.stroke();
    ink.current = true;
  };

  const finish = () => {
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas || !ink.current) return;
    canvas.toBlob((blob) => {
      onChange(blob ? new File([blob], `firma-${Date.now()}.png`, { type: "image/png" }) : null);
    }, "image/png");
  };

  const clear = () => {
    ink.current = false;
    onChange(null);
    prepareCanvas();
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="h-40 w-full touch-none rounded-lg border bg-white"
        aria-label="Área para dibujar la firma"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Firma con mouse, lápiz o pantalla táctil.</p>
        <Button type="button" size="sm" variant="outline" onClick={clear}>Limpiar</Button>
      </div>
    </div>
  );
}
