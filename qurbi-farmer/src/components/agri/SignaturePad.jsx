import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, CheckCircle2, PenLine, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Mouse, stylus and touch drawing via Pointer Events.
// Exposes clear(), isEmpty(), toDataURL() through its ref.
/** @typedef {{ clear: () => void, isEmpty: () => boolean, toDataURL: () => string }} SignaturePadHandle */

const SignaturePad = forwardRef(
  /**
   * @param {{ onInk?: (hasInk: boolean) => void, className?: string, showError?: boolean }} props
   * @param {React.ForwardedRef<SignaturePadHandle>} ref
   */
  function SignaturePad({ onInk, className, showError = false }, ref) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const inked = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const markInk = (value) => {
    inked.current = value;
    setHasInk(value);
    onInk?.(value);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    markInk(false);
  };

  useImperativeHandle(ref, () => ({
    clear,
    isEmpty: () => !inked.current,
    toDataURL: () => (canvasRef.current ? canvasRef.current.toDataURL("image/png") : ""),
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.scale(dpr, dpr);
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#1f2937";

    const position = (event) => {
      const bounds = canvas.getBoundingClientRect();
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };
    const startDrawing = (event) => {
      drawing.current = true;
      const { x, y } = position(event);
      context.beginPath();
      context.moveTo(x, y);
      event.preventDefault();
    };
    const draw = (event) => {
      if (!drawing.current) return;
      const { x, y } = position(event);
      context.lineTo(x, y);
      context.stroke();
      if (!inked.current) markInk(true);
      event.preventDefault();
    };
    const stopDrawing = () => {
      drawing.current = false;
    };

    canvas.addEventListener("pointerdown", startDrawing, { passive: false });
    canvas.addEventListener("pointermove", draw, { passive: false });
    window.addEventListener("pointerup", stopDrawing);
    return () => {
      canvas.removeEventListener("pointerdown", startDrawing);
      canvas.removeEventListener("pointermove", draw);
      window.removeEventListener("pointerup", stopDrawing);
    };
  }, [onInk]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative rounded-2xl border-2 border-dashed border-border bg-white overflow-hidden">
        {!hasInk && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none select-none">
            <PenLine className="w-5 h-5 text-muted-foreground/50" />
            <span className="text-base font-semibold text-muted-foreground">Sign here with your finger</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="block w-full touch-none cursor-crosshair"
          style={{ height: 180 }}
          aria-label="Digital signature area"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        {hasInk ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> Signature captured
          </span>
        ) : showError ? (
          <span role="alert" className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive">
            <AlertCircle className="w-4 h-4" /> Please sign in the box
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Required. Draw your usual signature.</span>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clear}
          className="h-11 px-4"
        >
          <Eraser className="w-4 h-4 mr-1.5" /> Clear
        </Button>
      </div>
    </div>
  );
});

export default SignaturePad;
