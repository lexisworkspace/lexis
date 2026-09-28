"use client";

// ============================================================
// Noor mini camera - native-style small capture window.
// No header, no borders, shutter lives inside the frame; the
// only icon before capture is the camera flip. After a snap:
// two round buttons (discard / keep). Tap outside to close.
// Streams stop on close; nothing stored beyond the attachment.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

  // Portal to <body>: the floating top-bar buttons are mounted at the root
  // stacking context, so a camera nested inside <main> could never paint
  // above them regardless of z-index.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[80] bg-black"
      role="dialog"
      aria-label="Camera"
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
          className={cn("absolute inset-0 h-full w-full object-cover", facing === "user" && "scale-x-[-1]")}
        />
      )}
      {snapped && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={snapped.dataUrl} alt="Captured" className="absolute inset-0 h-full w-full object-cover" />
      )}

      {/* Bottom gradient so controls read on any scene */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent" />

      {/* Close - top left, iOS camera style */}
      <button
        onClick={stopAndClose}
        className="absolute left-5 flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white"
        style={{ top: "calc(1rem + env(safe-area-inset-top, 0px))" }}
        aria-label="Close camera"
      >
        <XIcon className="h-5 w-5" />
      </button>

      {snapped ? (
        /* Captured: discard (x) / keep (tick) - iOS style */
        <div
          className="absolute inset-x-0 flex items-center justify-between px-10"
          style={{ bottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <button
            onClick={() => setSnapped(null)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm"
            aria-label="Discard photo"
          >
            <XIcon className="h-5 w-5" />
          </button>
          <button
            onClick={confirm}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white"
            aria-label="Keep photo"
          >
            <Check className="h-6 w-6" />
          </button>
        </div>
      ) : (
        !error && (
          <>
            {/* Shutter - big white ring near the bottom, native camera style */}
            <button
              onClick={snap}
              className="absolute left-1/2 -translate-x-1/2 rounded-full border-4 border-white/90 p-[6px]"
              style={{ bottom: "calc(2.5rem + env(safe-area-inset-bottom, 0px))" }}
              aria-label="Take photo"
            >
              <span className="block h-[64px] w-[64px] rounded-full bg-white" />
            </button>
            {/* Flip camera - right of the shutter */}
            <button
              onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
              className="absolute right-8 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm"
              style={{ bottom: "calc(3rem + env(safe-area-inset-bottom, 0px))" }}
              aria-label="Switch camera"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </>
        )
      )}
    </div>,
    document.body
  );
}
