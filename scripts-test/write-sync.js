const fs = require('fs');

const syncSettings = `"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Smartphone, Monitor, Tablet, Check, Camera,
  Wifi, Unlink, RefreshCw, X, QrCode,
} from "lucide-react";
import {
  createOffer, acceptOffer, acceptAnswer,
  onP2PConnectionChange, stopP2P,
} from "@/lib/p2p-sync";
import { getDeviceId, getDeviceName } from "@/lib/device-id";
import QRCode from "qrcode";

declare class BarcodeDetector {
  constructor(options: { formats: string[] });
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue: string }>>;
}

export function SyncSettings({ refresh }: { refresh: () => void }) {
  const [phase, setPhase] = useState<"idle"|"creating"|"show-offer"|"scanning-answer"|"waiting"|"scanning-offer"|"show-answer"|"connected">("idle");
  const [connected, setConnected] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const scanRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    onP2PConnectionChange((c) => { setConnected(c); if (c) setPhase("connected"); });
    return () => stopP2P();
  }, []);
  useEffect(() => () => stopScanner(), []);

  const stopScanner = () => {
    if (scanRef.current) { clearInterval(scanRef.current); scanRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setScanning(false);
  };

  const makeQR = async (data: string) => {
    const url = await QRCode.toDataURL(data, { width: 200, margin: 2, color: { dark: "#1a1a1a", light: "#ffffff" } });
    setQrUrl(url);
  };

  const startScanner = async (onScan: (code: string) => void) => {
    setScanning(true); setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 640 } } });
      streamRef.current = stream;
      const offscreen = document.createElement("video");
      offscreen.srcObject = stream;
      offscreen.setAttribute("playsinline", "true");
      await offscreen.play();
      if ("BarcodeDetector" in window) {
        const detector = new BarcodeDetector({ formats: ["qr_code"] });
        scanRef.current = setInterval(async () => {
          try {
            const bars = await detector.detect(offscreen);
            if (bars.length > 0 && bars[0].rawValue.trim().length > 10) { stopScanner(); onScan(bars[0].rawValue.trim()); }
          } catch {}
        }, 200);
      } else {
        setError("QR scan not supported on this browser");
        setTimeout(() => stopScanner(), 3000);
      }
    } catch { setError("Camera access denied"); setScanning(false); }
  };

  const handleCreateOffer = async () => {
    setPhase("creating"); setError("");
    try {
      const offer = await createOffer();
      await makeQR(offer);
      setPhase("show-offer");
    } catch (e) { setError("Failed: " + e); setPhase("idle"); }
  };

  const handleScanAnswer = async (answer: string) => {
    setPhase("waiting");
    try { await acceptAnswer(answer); setPhase("connected"); }
    catch (e) { setError("Failed: " + e); setPhase("show-offer"); }
  };

  const handleScanOffer = async (offer: string) => {
    setPhase("creating"); setError("");
    try {
      const answer = await acceptOffer(offer);
      await makeQR(answer);
      setPhase("show-answer");
    } catch (e) { setError("Failed: " + e); setPhase("idle"); }
  };

  const handleDisconnect = () => {
    stopP2P(); setConnected(false); setPhase("idle");
    setQrUrl(null); setError(""); refresh();
  };

  const DevIcon = ({ name }: { name: string }) => {
    if (/iphone|android phone/i.test(name)) return <Smartphone className="h-5 w-5 text-primary" />;
    if (/ipad|android tablet|tablet/i.test(name)) return <Tablet className="h-5 w-5 text-primary" />;
    return <Monitor className="h-5 w-5 text-primary" />;
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Wifi className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Sync across devices</h2>
      </div>
      <p className="text-sm text-muted-foreground">Connect two devices directly. No server, no accounts.</p>

      {connected && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-emerald-500" />
          <div className="flex-1"><p className="text-sm font-medium text-emerald-500">Connected</p><p className="text-xs text-muted-foreground">Syncing in real-time</p></div>
          <button onClick={handleDisconnect} className="text-xs text-muted-foreground hover:text-foreground">Disconnect</button>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 flex items-center gap-3">
          <X className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-500 flex-1">{error}</p>
          <button onClick={() => setError("")}><X className="h-4 w-4 text-red-500" /></button>
        </div>
      )}

      {phase === "idle" && !connected && (
        <div className="space-y-3">
          <button onClick={handleCreateOffer} className="w-full rounded-xl border border-border bg-card p-5 text-left hover:border-primary-500/40 transition-all">
            <div className="flex items-center gap-3"><QrCode className="h-6 w-6 text-primary" /><div><p className="text-sm font-medium">This device is first</p><p className="text-xs text-muted-foreground">Show a QR code for other devices to scan</p></div></div>
          </button>
          <button onClick={() => setPhase("scanning-offer")} className="w-full rounded-xl border border-border bg-card p-5 text-left hover:border-primary-500/40 transition-all">
            <div className="flex items-center gap-3"><Camera className="h-6 w-6 text-primary" /><div><p className="text-sm font-medium">Join from another device</p><p className="text-xs text-muted-foreground">Scan a QR code shown on your other device</p></div></div>
          </button>
        </div>
      )}

      {phase === "creating" && (
        <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
          <p className="text-sm text-blue-500">Setting up connection...</p>
        </div>
      )}

      {phase === "show-offer" && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-medium text-center">Show this on your other device</p>
          {qrUrl && <div className="flex justify-center"><div className="rounded-xl bg-white p-3"><img src={qrUrl} alt="QR" className="w-[200px] h-[200px] block" /></div></div>}
          <p className="text-xs text-center text-muted-foreground">After they scan this, scan their QR code below</p>
          <button onClick={() => { setPhase("scanning-answer"); startScanner(handleScanAnswer); }} className="w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary px-4 py-3 text-sm font-medium hover:bg-secondary/80 transition-all">
            <Camera className="h-4 w-4" /> Scan their QR code
          </button>
          {scanning && <CameraView />}
        </div>
      )}

      {phase === "scanning-answer" && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-medium text-center">Point at their QR code</p>
          {scanning && <CameraView />}
          <button onClick={() => { stopScanner(); setPhase("show-offer"); }} className="w-full text-xs text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
      )}

      {phase === "scanning-offer" &&
