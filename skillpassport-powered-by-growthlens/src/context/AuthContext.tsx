"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export interface UserProfileData {
  id: string;
  email: string;
  display_name: string | null;
  preferred_name?: string | null;
  headline: string | null;
  current_role: string;
  job_title?: string | null;
  specialization?: string | null;
  department_or_team?: string | null;
  location?: string | null;
  work_preference?: string | null;
  experience_level?: string | null;
  professional_goal?: string | null;
  professional_summary?: string | null;
  portfolio_url?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  privacy_preferences?: Record<string, any> | null;
  app_settings?: Record<string, any> | null;
  onboarding_status: "not_started" | "in_progress" | "completed";
  onboarding_current_step: number;
  onboarding_current_category: string;
  github_skipped?: boolean;
  jira_skipped?: boolean;
  onboarding_completed_at: string | null;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfileData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
    role?: string
  ) => Promise<{ error: Error | null; needsEmailVerification?: boolean; user?: User | null }>;
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfileData>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";
const API_BASE = `${BACKEND_URL.replace(/\/$/, "")}/api/v1`;

async function fetchProfileMe(token: string, method: string = "GET", body?: any): Promise<Response> {
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    ...(body ? { "Content-Type": "application/json" } : {}),
  };
  const bodyStr = body ? JSON.stringify(body) : undefined;

  // Try direct backend first (avoids Next.js rewrite proxy socket resets)
  try {
    const directResp = await fetch(`${API_BASE}/profile/me`, {
      method,
      headers,
      body: bodyStr,
    });
    if (directResp.ok) return directResp;
  } catch {
    // Direct backend connection failed, continue to fallback
  }

  // Fallback to relative proxy
  return fetch("/api/v1/profile/me", {
    method,
    headers,
    body: bodyStr,
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("sp_user_profile");
        if (cached) return JSON.parse(cached);
      } catch {
        // ignore storage parse error
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isEmailVerified = Boolean(
    user && (user.email_confirmed_at || (user as any).confirmed_at)
  );

  const fetchProfile = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.access_token) {
      setProfile(null);
      return;
    }
    try {
      const resp = await fetchProfileMe(currentSession.access_token);
      if (resp.ok) {
        const data = await resp.json();
        setProfile(data);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("sp_user_profile", JSON.stringify(data));
        }
      } else {
        console.warn("Failed to fetch user profile:", resp.status);
        if (resp.status === 401) {
          console.warn("User session is invalid or stale (401), signing out locally");
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch {}
          setSession(null);
          setUser(null);
          setProfile(null);
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("sp_user_profile");
          }
        }
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("Stale or invalid Supabase session detected; clearing local token:", error.message);
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch {}
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("sp_user_profile");
          }
        }
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          if (initialSession) {
            try {
              await fetchProfile(initialSession);
            } catch (err) {
              console.warn("Background profile fetch:", err);
            }
          }
          if (mounted) {
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession) {
          try {
            await fetchProfile(newSession);
          } catch (err) {
            console.warn("Background profile fetch:", err);
          }
        } else {
          setProfile(null);
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("sp_user_profile");
          }
        }
        if (mounted) {
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) {
        return { error };
      }
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        await fetchProfile(data.session);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName?: string,
    role: string = "employee"
  ) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const trimmedName = displayName?.trim() || normalizedEmail.split("@")[0];
      const callbackOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = callbackOrigin
        ? `${callbackOrigin}/auth/callback?next=/app/onboarding`
        : undefined;

      let { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
            role: role,
          },
          emailRedirectTo: redirectTo,
        },
      });

      // Handle hosted Supabase 429 rate limit fallback
      const isRateLimited = error && (
        (error as any).status === 429 ||
        error.message?.toLowerCase().includes("rate limit") ||
        error.message?.toLowerCase().includes("over_email_send_rate_limit")
      );

      if (isRateLimited) {
        console.warn(
          "Supabase email rate limit reached; provisioning user directly through backend fallback..."
        );
        try {
          const directSignupResp = await fetch(`${API_BASE}/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: normalizedEmail,
              password,
              full_name: trimmedName,
              role,
            }),
          });

          if (directSignupResp.ok) {
            // User was provisioned in database with confirmed status
            // Immediately establish real GoTrue JWT session via password sign-in
            const signInRes = await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password,
            });
            if (signInRes.data?.session) {
              setSession(signInRes.data.session);
              setUser(signInRes.data.user);
              await fetchProfile(signInRes.data.session);
              return {
                error: null,
                needsEmailVerification: false,
                user: signInRes.data.user,
              };
            }
          } else {
            const errJson = await directSignupResp.json().catch(() => ({}));
            if (errJson.detail) {
              return { error: new Error(errJson.detail), needsEmailVerification: false, user: null };
            }
          }
        } catch (provErr: any) {
          console.error("Direct signup provisioning fallback failed:", provErr);
        }
      }

      if (error) {
        return { error, needsEmailVerification: false, user: null };
      }

      // Check if user identities array is empty - indicates existing user when enumeration protection is enabled
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return {
          error: new Error("An account with this email address already exists. Please sign in or reset your password."),
          needsEmailVerification: false,
          user: data.user,
        };
      }

      // Authoritative verification check: session presence and email_confirmed_at
      const isConfirmed = Boolean(data.user?.email_confirmed_at || (data.user as any)?.confirmed_at);
      const hasActiveSession = Boolean(data.session);

      if (!isConfirmed && !hasActiveSession) {
        // Genuine email confirmation required by Supabase Auth
        return {
          error: null,
          needsEmailVerification: true,
          user: data.user,
        };
      }

      // If already confirmed (e.g. email confirmation disabled in current environment)
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        await fetchProfile(data.session);
      }

      return {
        error: null,
        needsEmailVerification: !isConfirmed,
        user: data.user,
      };
    } catch (err: any) {
      return { error: err, needsEmailVerification: false, user: null };
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const callbackOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = callbackOrigin
        ? `${callbackOrigin}/auth/callback?next=/app/onboarding`
        : undefined;

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      // Use local scope to safely clear local session and avoid 403 Forbidden
      // if the token was invalidated, expired, or deleted on the server.
      await supabase.auth.signOut({ scope: "local" });
    } catch (err) {
      console.warn("Supabase auth signOut warning (continuing local cleanup):", err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      // Clean local storage cache and session storage
      if (typeof window !== "undefined") {
        sessionStorage.clear();
        Object.keys(localStorage).forEach((key) => {
          if (
            key.startsWith("sb-") ||
            key.startsWith("sp_") ||
            key.startsWith("sp-") ||
            key.includes("supabase")
          ) {
            localStorage.removeItem(key);
          }
        });
      }
    }
  };

  const resetPasswordForEmail = async (email: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const redirectTo = typeof window !== "undefined"
        ? `${window.location.origin}/auth/reset-password`
        : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo,
      });

      if (error && (
        (error as any).status === 429 ||
        error.message?.toLowerCase().includes("rate limit") ||
        error.message?.toLowerCase().includes("over_email_send_rate_limit")
      )) {
        console.warn("Supabase reset password rate limited; triggering backend reset-password endpoint...");
        try {
          const bpResp = await fetch(`${API_BASE}/auth/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: normalizedEmail }),
          });
          if (bpResp.ok) {
            return { error: null };
          }
        } catch {}
      }

      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const refreshProfile = async () => {
    await fetchProfile(session);
  };

  const updateProfile = async (updates: Partial<UserProfileData>) => {
    if (!session?.access_token) {
      return { error: new Error("Not authenticated") };
    }
    try {
      const resp = await fetchProfileMe(session.access_token, "PATCH", updates);
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        return { error: new Error(errJson.detail || "Failed to update profile") };
      }
      const data = await resp.json();
      setProfile(data);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("sp_user_profile", JSON.stringify(data));
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isAuthenticated: !!user && !!session,
        isEmailVerified,
        signIn,
        signUp,
        resendVerificationEmail,
        signOut,
        resetPasswordForEmail,
        updatePassword,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
