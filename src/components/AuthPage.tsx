"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/components/AuthProvider";
import { motion } from "framer-motion";
import { Loader2, ArrowRight, Smartphone, Monitor, Tablet } from "lucide-react";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}
function MicrosoftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
      <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
    </svg>
  );
}

export function AuthPage({ onComplete }: { onComplete?: () => void }) {
  const { t } = useI18n();
  const { signInWithGoogle, signInWithApple, signInWithGitHub, signInWithMicrosoft, continueAsGuest, loading } = useAuth();
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState("");

  // Detect redirect errors from Supabase OAuth (provider not enabled, etc.)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errCode = params.get("error_code");
    const errMsg = params.get("error_description") || params.get("error") || "";
    if (errCode || errMsg) {
      if (errMsg.includes("not enabled") || errMsg.includes("validation_failed")) {
        setError("This sign-in method is not configured yet. Use Guest mode for now.");
      } else {
        setError(errMsg || "Sign-in failed. Try Guest mode.");
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleOAuth = async (fn: () => Promise<void>, provider: string) => {
    setError("");
    setSigningIn(provider);
    try {
      // Save onboarding state so the redirect resumes at the right step
      localStorage.setItem("orleia-onboarding-step", "auth");
      localStorage.setItem("orleia-oauth-pending", "1");
      await fn();
      onComplete?.();
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("not enabled") || msg.includes("validation_failed")) {
        setError(`${provider} sign-in is not configured yet. Use Guest mode for now.`);
      } else {
        setError(`Could not sign in with ${provider}. Try Guest mode.`);
      }
    } finally {
      setSigningIn("");
    }
  };

  const handleGuest = () => {
    continueAsGuest();
    onComplete?.();
  };

  if (loading) {
    return (<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>);
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-instrument), system-ui, sans-serif" }}>{t("auth.orleia")}</h1>
          <p className="text-muted-foreground text-sm">{t("auth.your_workspace_your_data_your_way")}</p>
        </div>
        <button onClick={handleGuest} className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-foreground/20 bg-transparent text-foreground/70 hover:border-foreground/40 hover:text-foreground transition-colors text-sm font-medium">{t("auth.continue_as_guest")}<ArrowRight className="h-4 w-4" /></button>
        <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or sync across devices</span></div></div>
        <div className="space-y-3">
          <button onClick={() => handleOAuth(signInWithGoogle, "Google")} disabled={!!signingIn} className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-border bg-background hover:bg-accent/50 transition-colors text-sm font-medium disabled:opacity-50">{signingIn === "Google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />} Continue with Google</button>
          <button onClick={() => handleOAuth(signInWithApple, "Apple")} disabled={!!signingIn} className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-border bg-background hover:bg-accent/50 transition-colors text-sm font-medium disabled:opacity-50">{signingIn === "Apple" ? <Loader2 className="h-4 w-4 animate-spin" /> : <AppleIcon />} Continue with Apple</button>
          <button onClick={() => handleOAuth(signInWithGitHub, "GitHub")} disabled={!!signingIn} className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-border bg-background hover:bg-accent/50 transition-colors text-sm font-medium disabled:opacity-50">{signingIn === "GitHub" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitHubIcon />} Continue with GitHub</button>
          <button onClick={() => handleOAuth(signInWithMicrosoft, "Microsoft")} disabled={!!signingIn} className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-border bg-background hover:bg-accent/50 transition-colors text-sm font-medium disabled:opacity-50">{signingIn === "Microsoft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MicrosoftIcon />} Continue with Microsoft</button>
        </div>
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground text-center bg-muted/50 rounded-lg px-3 py-2">{error}</motion.p>
        )}
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Monitor className="h-3.5 w-3.5" />{t("auth.desktop")}</span>
          <span className="flex items-center gap-1"><Tablet className="h-3.5 w-3.5" />{t("auth.tablet")}</span>
          <span className="flex items-center gap-1"><Smartphone className="h-3.5 w-3.5" />{t("auth.mobile")}</span>
        </div>
        <p className="text-center text-xs text-muted-foreground/60">Guest mode keeps everything on this device. Sign in to sync across devices.</p>
      </motion.div>
    </div>
  );
}
