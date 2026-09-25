"use client";

// ============================================================
// Noor mini camera - native-style small capture window.
// No header, no borders, shutter lives inside the frame; the
// only icon before capture is the camera flip. After a snap:
// two round buttons (discard / keep). Tap outside to close.
// Streams stop on close; nothing stored beyond the attachment.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { X as XIcon, Check, RefreshCw } from "lucide-react";
import { cn, generateId } from "@/lib/utils";

export interface CapturedPhoto {
  id: string;
  name: string;
  dataUrl: string;
  size: number;
}

interface MiniCameraProps {
  open: boolean;
  onClose: () => void;
  /** Receives the snapped photo as a ready-to-attach item. */
  onCapture: (photo: CapturedPhoto) => void;
}

export function MiniCamera({ open, onClose, onCapture }: MiniCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [snapped, setSnapped] = useState<{ dataUrl: string; ts: number } | null>(null);

  // Start/stop the camera with the window's lifecycle.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setSnapped(null);
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch {
        if (!cancelled) setError("Camera unavailable - check permissions.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, facing]);

  if (!open) return null;

  const stopAndClose = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    onClose();
  };

  const snap = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const maxEdge = 1280;
    const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setSnapped({ dataUrl: canvas.toDataURL("image/jpeg", 0.85), ts: Date.now() });
  };

  const confirm = () => {
    if (!snapped) return;
    onCapture({
      id: generateId(),
      name: `photo-${new Date(snapped.ts).toISOString().slice(0, 19).replace(/[:T]/g, "-")}.jpg`,
      dataUrl: snapped.dataUrl,
      size: Math.round((snapped.dataUrl.length * 3) / 4),
    });
    stopAndClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 sm:p-8"
      onClick={stopAndClose}
    >
      <div
        className="relative aspect-[3/4] w-full max-w-[min(92vw,420px)] max-h-[82dvh] overflow-hidden rounded-[32px] bg-black shadow-2xl sm:aspect-[4/3] sm:max-w-[min(70vw,640px)] sm:max-h-[78dvh]"
        role="dialog"
        aria-label="Camera"
        onClick={(e) => e.stopPropagation()}
      >
        {error ? (
          <div className="flex h-full items-center justify-center px-8 text-center text-xs text-white/60">
            {error}
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className={cn("h-full w-full object-cover", facing === "user" && "scale-x-[-1]")}
          />
        )}
        {snapped && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={snapped.dataUrl} alt="Captured" className="absolute inset-0 h-full w-full object-cover" />
        )}

        {/* Bottom gradient so controls read on any scene */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/55 to-transparent" />

        {snapped ? (
          /* Captured: discard (x) / keep (tick) - round, inside the frame */
          <div className="absolute inset-x-0 bottom-5 flex items-center justify-between px-8">
            <button
              onClick={() => setSnapped(null)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white"
              aria-label="Discard photo"
            >
              <XIcon className="h-5 w-5" />
            </button>
            <button
              onClick={confirm}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white"
              aria-label="Keep photo"
            >
              <Check className="h-5 w-5" />
            </button>
          </div>
        ) : (
          !error && (
            <>
              {/* Shutter - inside the frame, no icon, iOS style */}
              <button
                onClick={snap}
                className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border-[3px] border-white/90 p-[5px]"
                aria-label="Take photo"
              >
                <span className="block h-[52px] w-[52px] rounded-full bg-white" />
              </button>
              {/* Flip camera - the only icon before capture */}
              <button
                onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
                className="absolute bottom-8 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white"
                aria-label="Switch camera"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </>
          )
        )}
      </div>
    </div>
  );
}
