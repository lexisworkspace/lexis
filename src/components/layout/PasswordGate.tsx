"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Eye, EyeOff, Info, HelpCircle, AlertTriangle,
  ArrowLeft, RefreshCw, Shield, Fingerprint,
} from "lucide-react";
import { isBiometricsAvailable, isBiometricsEnabled, authenticateBiometric } from "@/lib/biometric";
import { NumericPin, isPinSet, clearPin } from "@/components/NumericPin";

const PASSWORD_KEY = "orleia-password";

export function isPasswordSet(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(PASSWORD_KEY) !== null && (localStorage.getItem(PASSWORD_KEY) || "").length > 0; }
  catch { return false; }
}

export function storePassword(pw: string): boolean {
  if (typeof window === "undefined") return false;
  try { localStorage.setItem(PASSWORD_KEY, pw); return localStorage.getItem(PASSWORD_KEY) === pw; }
  catch { return false; }
}

export function verifyPassword(pw: string): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(PASSWORD_KEY) === pw; }
  catch { return false; }
}

export function clearPassword(): void {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(PASSWORD_KEY); } catch {}
}

const UNLOCK_KEY = "orleia-unlocked-this-session";
export function isUnlockedThisSession(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(UNLOCK_KEY) === "1";
}
export function markUnlockedThisSession(): void {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(UNLOCK_KEY, "1"); } catch {}
}

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const check = () => setM(window.innerWidth < 768);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return m;
}

export function PasswordGate({ mode, onUnlock, showSkip = false, onResetComplete }: {
  mode: "setup" | "unlock"; onUnlock: () => void; showSkip?: boolean; onResetComplete?: () => void;
}) {
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<"info" | "confirm" | "done">("info");
  const [submitting, setSubmitting] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometricsLoading, setBiometricsLoading] = useState(false);
  const isSetup = mode === "setup";
  useEffect(() => {
    if (mode === "unlock" && isMobile) {
      (async () => {
        const bio = await isBiometricsAvailable();
        setBiometricsAvailable(bio);
        setBiometricsEnabled(isBiometricsEnabled());
      })();
    }
  }, [mode, isMobile]);

  useEffect(() => { if (error) setError(""); }, [password, confirmPassword]);

  const handleBiometric = useCallback(async () => {
    setBiometricsLoading(true); setError("");
    const r = await authenticateBiometric();
    setBiometricsLoading(false);
    if (r.ok) { markUnlockedThisSession(); onUnlock(); }
    else setError(r.error || "Biometric failed");
  }, [onUnlock]);

  const handlePinSuccess = useCallback(() => {
    markUnlockedThisSession(); onUnlock();
  }, [onUnlock]);

  const handleSubmit = useCallback(() => {
    if (submitting) return;
    if (!password) { setError(isSetup ? "Choose a password first." : "Enter your password."); return; }
    if (isSetup) {
      if (password.length < 3) { setError("At least 3 characters."); return; }
      if (password !== confirmPassword) { setError("Passwords don't match."); return; }
      setSubmitting(true);
      if (storePassword(password)) onUnlock();
      else { setError("Failed to save."); setSubmitting(false); }
    } else {
      setSubmitting(true);
      if (verifyPassword(password)) { markUnlockedThisSession(); onUnlock(); }
      else { setError("Wrong password."); setPassword(""); setSubmitting(false); }
    }
  }, [password, confirmPassword, isSetup, onUnlock, submitting]);

  const handleReset = () => {
    clearPassword(); clearPin(); setForgotStep("done");
    setTimeout(() => { onResetComplete ? onResetComplete() : onUnlock(); }, 2000);
  };

  const bgLines = (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute top-1/4 left-1/4 h-px w-32 -translate-x-1/2 bg-border" />
      <div className="absolute top-1/4 left-1/4 h-32 w-px -translate-y-1/2 bg-border" />
      <div className="absolute bottom-1/3 right-1/4 h-px w-20 bg-border/50" />
      <div className="absolute top-1/3 right-1/3 h-24 w-px bg-border/30" />
      <div className="absolute bottom-1/4 left-1/3 h-px w-16 bg-border/40" />
    </div>
  );

  // Forgot password flow
  if (!isSetup && showForgot) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
        {bgLines}
        <AnimatePresence mode="wait">
          {forgotStep === "info" && (
            <motion.div key="fi" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:0.35,ease:"easeOut"}} className="relative z-10 mx-auto w-full max-w-sm px-6">
              <p className="mb-6 text-[11px] font-mono tracking-widest text-muted-foreground/40">{t("gate.forgot")}</p>
              <div className="mb-8 h-px w-12 bg-primary-500/50" />
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><HelpCircle className="h-5 w-5 text-primary-500" /></div>
                <h1 className="text-3xl font-bold tracking-tight leading-none">Forgot your {isMobile ? "PIN" : "password"}?</h1>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                Since ORLEIA is fully local and private, there is no server to send a reset to.
                Your {isMobile ? "PIN" : "password"} never leaves this device.
              </p>
              <div className="flex flex-col gap-3">
                <button onClick={() => setForgotStep("confirm")} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-5 py-3 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]">Reset {isMobile ? "PIN" : "password"} <RefreshCw className="h-3.5 w-3.5" /></button>
                <button onClick={() => { setShowForgot(false); setForgotStep("info"); }} className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-border px-5 py-3 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-secondary active:scale-[0.98]"><ArrowLeft className="h-3.5 w-3.5" />{t("gate.back")}</button>
              </div>
            </motion.div>
          )}
          {forgotStep === "confirm" && (
            <motion.div key="fc" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:0.35,ease:"easeOut"}} className="relative z-10 mx-auto w-full max-w-sm px-6">
              <p className="mb-6 text-[11px] font-mono tracking-widest text-muted-foreground/40">{t("gate.confirm")}</p>
              <div className="mb-8 h-px w-12 bg-primary-500/50" />
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10"><AlertTriangle className="h-5 w-5 text-amber-500" /></div>
                <h1 className="text-3xl font-bold tracking-tight leading-none">{t("gate.are_you_sure")}</h1>
              </div>
              <p className="mb-8 text-sm text-muted-foreground leading-relaxed">This will clear your {isMobile ? "PIN" : "password"}. Your data stays intact.</p>
              <div className="flex flex-col gap-3">
                <button onClick={handleReset} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-5 py-3 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98]">{t("gate.yes_reset")}<ArrowRight className="h-3.5 w-3.5" /></button>
                <button onClick={() => setForgotStep("info")} className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-border px-5 py-3 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-secondary active:scale-[0.98]"><ArrowLeft className="h-3.5 w-3.5" />{t("gate.go_back")}</button>
              </div>
            </motion.div>
          )}
          {forgotStep === "done" && (
            <motion.div key="fd" initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={{duration:0.35}} className="relative z-10 mx-auto w-full max-w-sm px-6 text-center">
              <div className="mb-8 mx-auto h-px w-12 bg-primary-500/50" />
              <div className="flex justify-center mb-6"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10"><RefreshCw className="h-8 w-8 text-green-400" /></div></div>
              <h1 className="text-2xl font-bold tracking-tight mb-3">{isMobile ? "PIN" : "Password"} reset!</h1>
              <p className="text-sm text-muted-foreground">{t("gate.setting_up_a_new_one")}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
  // MOBILE: Setup - PIN pad
  if (isSetup && isMobile) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
        {bgLines}
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.35,ease:"easeOut"}} className="relative z-10 mx-auto w-full max-w-sm px-6">
          <p className="mb-6 text-[11px] font-mono tracking-widest text-muted-foreground/40">{t("gate.security")}</p>
          <div className="mb-8 h-px w-12 bg-primary-500/50" />
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><Shield className="h-5 w-5 text-primary-500" /></div>
            <h1 className="text-3xl font-bold tracking-tight leading-none">{t("gate.protect_your_space")}</h1>
          </div>
          <p className="mb-8 text-sm text-muted-foreground leading-relaxed max-w-xs">{t("gate.set_a_4_digit_pin_to_keep_your_thoughts_")}</p>
          <NumericPin mode="setup" onSuccess={handlePinSuccess} />
          {showSkip && (
            <button onClick={() => onUnlock()} className="w-full text-center text-xs text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors py-4 mt-4">{t("gate.skip")}</button>
          )}
        </motion.div>
      </div>
    );
  }

  // MOBILE: Unlock - Biometrics + PIN
  if (!isSetup && isMobile) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
        {bgLines}
        <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.35,ease:"easeOut"}} className="relative z-10 mx-auto w-full max-w-sm px-6">
          <p className="mb-6 text-[11px] font-mono tracking-widest text-muted-foreground/40">{t("gate.unlock")}</p>
          <div className="mb-8 h-px w-12 bg-primary-500/50" />
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><Shield className="h-5 w-5 text-primary-500" /></div>
            <h1 className="text-3xl font-bold tracking-tight leading-none">{t("gate.welcome_back")}</h1>
          </div>
          {biometricsAvailable && biometricsEnabled && (
            <button onClick={handleBiometric} disabled={biometricsLoading} className="w-full inline-flex items-center justify-center gap-3 rounded-2xl border border-border bg-secondary/40 px-5 py-4 text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-secondary/60 active:scale-[0.98] disabled:opacity-50 mb-6">
              {biometricsLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Fingerprint className="h-5 w-5" />}
              Unlock with Face ID / Touch ID
            </button>
          )}
          {error && <motion.p initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} className="text-xs text-red-400 mb-4 text-center">{error}</motion.p>}
          <NumericPin mode="unlock" onSuccess={handlePinSuccess} />
          <button onClick={() => setShowForgot(true)} className="w-full text-center text-xs text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors py-4 mt-4">{t("gate.forgot_pin")}</button>
        </motion.div>
      </div>
    );
  }
  // DESKTOP: Text password (setup + unlock)
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      {bgLines}
      <AnimatePresence mode="wait">
        <motion.div key={mode} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.35,ease:"easeOut"}} className="relative z-10 mx-auto w-full max-w-sm px-6">
          <p className="mb-6 text-[11px] font-mono tracking-widest text-muted-foreground/40">{isSetup ? "SECURITY" : "UNLOCK"}</p>
          <div className="mb-8 h-px w-12 bg-primary-500/50" />
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><Shield className="h-5 w-5 text-primary-500" /></div>
            <h1 className="text-3xl font-bold tracking-tight leading-none">{isSetup ? "Protect your space" : "Welcome back"}</h1>
          </div>
          <p className="mb-2 text-sm text-muted-foreground leading-relaxed max-w-xs">{isSetup ? "Add a local password to keep your thoughts private." : "Enter your password to continue."}</p>

          <button onClick={() => setShowInfo(!showInfo)} className="flex items-center gap-1.5 mb-6 text-xs text-muted-foreground/50 hover:text-muted-foreground/70 transition-colors">
            <Info className="h-3 w-3" />
            <span>{t("gate.why_a_password_not_a_login")}</span>
          </button>

          <AnimatePresence>
            {showInfo && (
              <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden mb-6">
                <div className="rounded-xl bg-muted border border-border p-4 text-xs text-muted-foreground/70 leading-relaxed space-y-2">
                  <p><strong className="text-foreground">{t("gate.orleia_is_free_local_and_private")}</strong>{t("gate.no_accounts_no_servers_no_subscriptions")}</p>
                  <p>{t("gate.your_password_stays")}<strong className="text-foreground">on this device only</strong>. Just a simple lock so your thoughts stay yours.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-3">
            <div className="relative">
              <input id="orleia-password" name="orleia-password" autoComplete="new-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isSetup ? "Choose a password..." : "Enter your password..."} autoFocus disabled={submitting} className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-10 text-sm placeholder:text-muted-foreground/40 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 transition-all duration-200" />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors" tabIndex={-1} type="button">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <AnimatePresence>
              {isSetup && (
                <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="relative">
                  <input id="orleia-confirm-password" name="orleia-confirm-password" autoComplete="new-password" type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t("gate.confirm_your_password")} disabled={submitting} className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-10 text-sm placeholder:text-muted-foreground/40 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 transition-all duration-200" />
                  <button onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors" tabIndex={-1} type="button">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {error && <motion.p initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} className="text-xs text-zinc-400">{error}</motion.p>}

            <button onClick={handleSubmit} disabled={submitting} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-5 py-3 text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98] mt-1 disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? "Processing..." : isSetup ? <>{t("gate.set_password")}<ArrowRight className="h-3.5 w-3.5" /></> : <>{t("gate.unlock_2")}<ArrowRight className="h-3.5 w-3.5" /></>}
            </button>

            {isSetup && showSkip && (
              <button onClick={() => onUnlock()} disabled={submitting} className="w-full text-center text-xs text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors py-1 disabled:opacity-50">{t("gate.skip")}</button>
            )}

            {!isSetup && (
              <button onClick={() => setShowForgot(true)} disabled={submitting} className="w-full text-center text-xs text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors py-1 disabled:opacity-50">{t("gate.forgot_password")}</button>
            )}
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}