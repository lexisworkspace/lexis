"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Delete } from "lucide-react";

const PIN_LENGTH = 4;
const PIN_STORAGE_KEY = "lexis-pin";

export function isPinSet(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(PIN_STORAGE_KEY);
    return stored !== null && stored.length > 0;
  } catch {
    return false;
  }
}

export async function storePin(pin: string): Promise<boolean> {
  try {
    const hash = await sha256Hex(pin + "lexis-pin-salt");
    localStorage.setItem(PIN_STORAGE_KEY, hash);
    const v = localStorage.getItem(PIN_STORAGE_KEY);
    return v === hash;
  } catch {
    return false;
  }
}

export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const stored = localStorage.getItem(PIN_STORAGE_KEY);
    if (!stored) return false;
    const hash = await sha256Hex(pin + "lexis-pin-salt");
    return hash === stored;
  } catch {
    return false;
  }
}

export function clearPin(): void {
  localStorage.removeItem(PIN_STORAGE_KEY);
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface NumericPinProps {
  mode: "setup" | "unlock";
  onSuccess: () => void;
}

export function NumericPin({ mode, onSuccess }: NumericPinProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleDigit = useCallback(
    (digit: string) => {
      if (submitting) return;
      setError("");
      setPin((prev) => {
        if (prev.length >= PIN_LENGTH) return prev;
        const next = prev + digit;
        if (next.length === PIN_LENGTH) {
          // Auto-submit when full
          setTimeout(() => handleAutoSubmit(next), 100);
        }
        return next;
      });
    },
    [submitting, step, confirmPin, mode, onSuccess]
  );

  const handleAutoSubmit = useCallback(
    async (entered: string) => {
      if (mode === "setup") {
        if (step === "enter") {
          setConfirmPin(entered);
          setStep("confirm");
          setPin("");
        } else {
          // confirm step
          if (entered === confirmPin) {
            setSubmitting(true);
            const ok = await storePin(entered);
            if (ok) onSuccess();
            else {
              setError("Failed to save");
              setSubmitting(false);
              setStep("enter");
              setPin("");
              setConfirmPin("");
            }
          } else {
            setError("PINs don't match");
            setStep("enter");
            setPin("");
            setConfirmPin("");
          }
        }
      } else {
        // unlock
        setSubmitting(true);
        const valid = await verifyPin(entered);
        if (valid) onSuccess();
        else {
          setError("Wrong PIN");
          setPin("");
          setSubmitting(false);
        }
      }
    },
    [step, confirmPin, mode, onSuccess]
  );

  const handleBackspace = useCallback(() => {
    setError("");
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const dots = Array.from({ length: PIN_LENGTH });

  return (
    <div className="flex flex-col items-center gap-6">
      {/* PIN dots */}
      <div className="flex gap-4">
        {dots.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              scale: i < pin.length ? 1.2 : 1,
              backgroundColor:
                i < pin.length
                  ? "rgb(var(--foreground))"
                  : "rgb(var(--border))",
            }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="h-3.5 w-3.5 rounded-full"
          />
        ))}
      </div>

      {/* Label */}
      <p className="text-sm text-muted-foreground">
        {mode === "setup"
          ? step === "enter"
            ? "Create a 4-digit PIN"
            : "Confirm your PIN"
          : "Enter your PIN"}
      </p>

      {/* Error */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-400 -mt-2"
        >
          {error}
        </motion.p>
      )}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3 w-56">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button
            key={digit}
            onClick={() => handleDigit(digit)}
            disabled={submitting || pin.length >= PIN_LENGTH}
            className="h-14 rounded-2xl bg-secondary/60 text-foreground text-xl font-medium
              transition-all active:scale-95 active:bg-secondary hover:bg-secondary/80
              disabled:opacity-30 border border-border/50"
          >
            {digit}
          </button>
        ))}
        <div /> {/* empty space */}
        <button
          onClick={() => handleDigit("0")}
          disabled={submitting || pin.length >= PIN_LENGTH}
          className="h-14 rounded-2xl bg-secondary/60 text-foreground text-xl font-medium
            transition-all active:scale-95 active:bg-secondary hover:bg-secondary/80
            disabled:opacity-30 border border-border/50"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          disabled={submitting || pin.length === 0}
          className="h-14 rounded-2xl bg-secondary/60 text-foreground
            transition-all active:scale-95 hover:bg-secondary/80
            disabled:opacity-30 border border-border/50 flex items-center justify-center"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>

      {submitting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted-foreground/50"
        >
          Verifying...
        </motion.div>
      )}
    </div>
  );
}
