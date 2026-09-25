"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getSupabase } from "@/lib/supabase";
import { isDesktop } from "@/lib/desktop-bridge";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signInWithGitHub: async () => {},
  signInWithMicrosoft: async () => {},
  continueAsGuest: () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const GUEST_KEY = "orleia-guest-mode";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const sb = getSupabase();

  // Check if guest mode is enabled
  useEffect(() => {
    const guest = localStorage.getItem(GUEST_KEY) === "1";
    setIsGuest(guest);
    if (guest) {
      setLoading(false);
      return;
    }
    if (!sb) {
      setLoading(false);
      return;
    }
    // Get initial session
    sb.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [sb]);

  const signInWith = useCallback(async (provider: "google" | "apple" | "github" | "azure") => {
    if (!sb) return;
    localStorage.removeItem(GUEST_KEY);
    setIsGuest(false);

    if (isDesktop()) {
      // Electron: redirect within the BrowserWindow (not popup)
      // Get the OAuth URL and navigate the window directly
      const { data, error } = await sb.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: "https://app.orleia.app/auth/success",
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } else {
      // Browser: use default popup/redirect flow
      await sb.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: "https://app.orleia.app/auth/success",
        },
      });
    }
  }, [sb]);

  const continueAsGuest = useCallback(() => {
    localStorage.setItem(GUEST_KEY, "1");
    setIsGuest(true);
    setLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    if (sb) await sb.auth.signOut();
    localStorage.removeItem(GUEST_KEY);
    localStorage.removeItem("orleia-auth-done");
    setIsGuest(false);
  }, [sb]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signInWithGoogle: () => signInWith("google"),
        signInWithApple: () => signInWith("apple"),
        signInWithGitHub: () => signInWith("github"),
        signInWithMicrosoft: () => signInWith("azure"),
        continueAsGuest,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
