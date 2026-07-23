"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Info,
  HelpCircle,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Shield,
} from "lucide-react";

const PASSWORD_KEY = "lexis-password";

// ============================================================
// Password storage functions — simple, robust, no edge cases
// ============================================================

export function isPasswordSet(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(PASSWORD_KEY);
    return stored !== null && stored.length > 0;
  } catch {
    return false;
  }
}

export function storePassword(password: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(PASSWORD_KEY, password);
    // Verify it was stored
    const verification = localStorage.getItem(PASSWORD_KEY);
    return verification === password;
  } catch {
    return false;
  }
}

export function verifyPassword(password: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(PASSWORD_KEY);
    return stored !== null && stored === password;
  } catch {
    return false;
  }
}

export function clearPassword(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PASSWORD_KEY);
  } catch {
    // silently fail
  }
}

// ============================================================
// PasswordGate Component
// ============================================================

export function PasswordGate({
  mode,
  onUnlock,
  showSkip = false,
}: {
  mode: "setup" | "unlock";
  onUnlock: () => void;
  showSkip?: boolean;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<"info" | "confirm" | "done">("info");
  const [submitting, setSubmitting] = useState(false);

  const isSetup = mode === "setup";

  // Clear error when user types
  useEffect(() => {
    if (error) setError("");
  }, [password, confirmPassword]);

  const handleSubmit = useCallback(() => {
    if (submitting) return;

    if (!password) {
      setError(isSetup ? "Choose a password first." : "Enter your password.");
      return;
    }

    if (isSetup) {
      // Setup mode — store new password
      if (password.length < 3) {
        setError("At least 3 characters. Make it memorable.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords don't match. Try again.");
        return;
      }
      setSubmitting(true);
      const success = storePassword(password);
      if (success) {
        onUnlock();
      } else {
        setError("Failed to save password. Try again.");
        setSubmitting(false);
      }
    } else {
      // Unlock mode — verify password
      setSubmitting(true);
      const valid = verifyPassword(password);
      if (valid) {
        onUnlock();
      } else {
        setError("That's not right. Try again.");
        setPassword("");
        setSubmitting(false);
      }
    }
  }, [password, confirmPassword, isSetup, onUnlock, submitting]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  const handleReset = () => {
    clearPassword();
    setForgotStep("done");
    setTimeout(() => {
      onUnlock();
    }, 2000);
  };

  const handleSkip = () => {
    onUnlock();
  };

  // ============================================================
  // Forgot password flow
  // ============================================================

  if (!isSetup && showForgot) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 h-px w-32 -translate-x-1/2 bg-border" />
          <div className="absolute top-1/4 left-1/4 h-32 w-px -translate-y-1/2 bg-border" />
          <div className="absolute bottom-1/3 right-1/4 h-px w-20 bg-border/50" />
          <div className="absolute top-1/3 right-1/3 h-24 w-px bg-border/30" />
          <div className="absolute bottom-1/4 left-1/3 h-px w-16 bg-border/40" />
          <div className="absolute bottom-1/2 right-1/4 h-16 w-px bg-border/20" />
        </div>

        <AnimatePresence mode="wait">
          {forgotStep === "info" && (
            <motion.div
              key="forgot-info"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="relative z-10 mx-auto w-full max-w-sm px-6"
            >
              <p className="mb-6 text-[11px] font-mono tracking-widest text-muted-foreground/40">
                FORGOT
              </p>
              <div className="mb-8 h-px w-12 bg-primary-500/50" />

              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <HelpCircle className="h-5 w-5 text-primary-500" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight leading-none">
                  Forgot your password?
                </h1>
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Since LEXIS is fully local and private, there's no server to send a reset email to.
                  Your password never leaves this device — which means <strong className="text-foreground">we can't recover it either</strong>.
                </p>

                <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-muted-foreground/70 leading-relaxed space-y-1.5">
                      <p>
                        <strong className="text-foreground">The good news:</strong> We don't run an auth
                        service because every dollar we save goes into keeping LEXIS free for everyone.
                      </p>
                      <p>
                        <strong className="text-foreground">The fix:</strong> You can reset your password
                        right here. Your data — habits, notes, journal, tasks — stays safe. Only the lock
                        gets reset.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setForgotStep("confirm")}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-5 py-3 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  Reset password
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    setShowForgot(false);
                    setForgotStep("info");
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-border px-5 py-3 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-secondary active:scale-[0.98]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to unlock
                </button>
              </div>
            </motion.div>
          )}

          {forgotStep === "confirm" && (
            <motion.div
              key="forgot-confirm"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="relative z-10 mx-auto w-full max-w-sm px-6"
            >
              <p className="mb-6 text-[11px] font-mono tracking-widest text-muted-foreground/40">
                CONFIRM
              </p>
              <div className="mb-8 h-px w-12 bg-primary-500/50" />

              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight leading-none">
                  Are you sure?
                </h1>
              </div>

              <p className="mb-8 text-sm text-muted-foreground leading-relaxed">
                This will clear your current password. Your <strong className="text-foreground">data stays intact</strong> —
                habits, notes, journal entries, and tasks are all preserved. You'll just need to
                set a new password to continue.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleReset}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-5 py-3 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  Yes, reset and set a new password
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setForgotStep("info")}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-border px-5 py-3 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-secondary active:scale-[0.98]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Go back
                </button>
              </div>
            </motion.div>
          )}

          {forgotStep === "done" && (
            <motion.div
              key="forgot-done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="relative z-10 mx-auto w-full max-w-sm px-6 text-center"
            >
              <p className="mb-6 text-[11px] font-mono tracking-widest text-muted-foreground/40">
                DONE
              </p>
              <div className="mb-8 mx-auto h-px w-12 bg-primary-500/50" />

              <div className="flex justify-center mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10">
                  <RefreshCw className="h-8 w-8 text-green-400" />
                </div>
              </div>

              <h1 className="text-2xl font-bold tracking-tight mb-3">
                Password reset!
              </h1>

              <p className="text-sm text-muted-foreground leading-relaxed">
                Your password has been cleared. We'll take you to set up a new one.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ============================================================
  // Main password screen (setup or unlock)
  // ============================================================

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      {/* Abstract decorative lines */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-px w-32 -translate-x-1/2 bg-border" />
        <div className="absolute top-1/4 left-1/4 h-32 w-px -translate-y-1/2 bg-border" />
        <div className="absolute bottom-1/3 right-1/4 h-px w-20 bg-border/50" />
        <div className="absolute top-1/3 right-1/3 h-24 w-px bg-border/30" />
        <div className="absolute bottom-1/4 left-1/3 h-px w-16 bg-border/40" />
        <div className="absolute bottom-1/2 right-1/4 h-16 w-px bg-border/20" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative z-10 mx-auto w-full max-w-sm px-6"
        >
          {/* Top label */}
          <p className="mb-6 text-[11px] font-mono tracking-widest text-muted-foreground/40">
            {isSetup ? "SECURITY" : "UNLOCK"}
          </p>

          <div className="mb-8 h-px w-12 bg-primary-500/50" />

          {/* Title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Shield className="h-5 w-5 text-primary-500" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight leading-none">
              {isSetup ? "Protect your space" : "Welcome back"}
            </h1>
          </div>

          {/* Description */}
          <p className="mb-2 text-sm text-muted-foreground leading-relaxed max-w-xs">
            {isSetup
              ? "Add a local password to keep your thoughts private. This is optional — you can skip."
              : "Enter your password to continue."}
          </p>

          {/* Info toggle */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="flex items-center gap-1.5 mb-6 text-xs text-muted-foreground/50 hover:text-muted-foreground/70 transition-colors"
          >
            <Info className="h-3 w-3" />
            <span>Why a password, not a login?</span>
          </button>

          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="rounded-xl bg-muted border border-border p-4 text-xs text-muted-foreground/70 leading-relaxed space-y-2">
                  <p>
                    <strong className="text-foreground">LEXIS is free, local, and private.</strong> That means no
                    accounts, no servers, no subscriptions — and no auth provider.
                  </p>
                  <p>
                    Authentication plans cost money. We don't have a budget for that. Every user account,
                    every password reset, every session — it adds up fast.
                  </p>
                  <p>
                    So instead, your password stays <strong className="text-foreground">on this device only</strong>.
                    It's not sent anywhere. It's not stored on a server. It's just a simple lock so your
                    thoughts stay yours.
                  </p>
                  <p className="text-muted-foreground/40 pt-1">
                    No cloud. No tracking. No catch. Just you and your work.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-3">
            {/* Password input */}
            <div className="relative">
              <input
                id="lexis-password"
                name="lexis-password"
                autoComplete="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSetup ? "Choose a password..." : "Enter your password..."}
                autoFocus
                disabled={submitting}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-10 text-sm
                  placeholder:text-muted-foreground/40 disabled:opacity-50
                  focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50
                  transition-all duration-200"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                tabIndex={-1}
                type="button"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Confirm password — only during setup */}
            <AnimatePresence>
              {isSetup && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="relative"
                >
                  <input
                    id="lexis-confirm-password"
                    name="lexis-confirm-password"
                    autoComplete="new-password"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password..."
                    disabled={submitting}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-10 text-sm
                      placeholder:text-muted-foreground/40 disabled:opacity-50
                      focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50
                      transition-all duration-200"
                  />
                  <button
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    tabIndex={-1}
                    type="button"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-xs text-zinc-400"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-5 py-3 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98] mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                "Processing..."
              ) : isSetup ? (
                <>
                  Set password
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Unlock
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>

            {/* Skip button — only during setup */}
            {isSetup && showSkip && (
              <button
                onClick={handleSkip}
                disabled={submitting}
                className="w-full text-center text-xs text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors py-1 disabled:opacity-50"
              >
                Skip — I'll set one later
              </button>
            )}

            {/* Forgot password link — only during unlock */}
            {!isSetup && (
              <button
                onClick={() => setShowForgot(true)}
                disabled={submitting}
                className="w-full text-center text-xs text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors py-1 disabled:opacity-50"
              >
                Forgot password?
              </button>
            )}
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
