"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Shield, Smartphone, Monitor, Tablet, Check, Camera, Wifi, RefreshCw, X, QrCode } from "lucide-react";
import { createOffer, acceptOffer, acceptAnswer, onP2PConnectionChange, stopP2P } from "@/lib/p2p-sync";
import { getDeviceName } from "@/lib/device-id";
import QRCode from "qrcode";

declare class BarcodeDetector {
  constructor(o: { formats: string[] });
  detect(s: ImageBitmapSource): Promise<Array<{ rawValue: string }>>;
}

export function SyncSettings({ refresh }: { refresh: () => void }) {
  type Phase = "idle"|"creating"|"show-offer"|"scanning-answer"|"waiting"|"scanning-offer"|"show-answer"|"connected";
  const [phase, setPhase] = useState<Phase>("idle");
  const [connected, setConnected] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const scanRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { onP2PConnectionChange((c) => { setConnected(c); if (c) setPhase("connected"); }); return () => stopP2P(); }, []);
  useEffect(() => () => stopScanner(), []);

  const stopScanner = () => {
    if (scanRef.current) { clearInterval(scanRef.current); scanRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setScanning(false);
  };

  const makeQR = async (data: string) => {
    setQrUrl(await QRCode.toDataURL(data, { width: 200, margin: 2, color: { dark: "#1a1a1a", light: "#ffffff" } }));
  };

  const startScanner = async (onScan: (code: string) => void) => {
    setScanning(true); setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 640 } } });
      streamRef.current = stream;
      const offscreen = document.createElement("video");
      offscreen.srcObject = stream; offscreen.setAttribute("playsinline", "true"); await offscreen.play();
      if ("BarcodeDetector" in window) {
        const detector = new BarcodeDetector({ formats: ["qr_code"] });
        scanRef.current = setInterval(async () => {
          try { const bars = await detector.detect(offscreen); if (bars.length > 0 && bars[0].rawValue.trim().length > 10) { stopScanner(); onScan(bars[0].rawValue.trim()); } } catch {}
        }, 200);
      } else { setError("QR scan not supported"); setTimeout(() => stopScanner(), 3000); }
    } catch { setError("Camera denied"); setScanning(false); }
  };