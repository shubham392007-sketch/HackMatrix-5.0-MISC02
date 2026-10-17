"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export interface UserProfileData {
  id: string;
  email: string;
  display_name: string | null;
  headline: string | null;
  current_role: string;
  job_title?: string | null;
  specialization?: string | null;
  department_or_team?: string | null;
  experience_level?: string | null;
  professional_goal?: string | null;
  professional_summary?: string | null;
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
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
    role?: string
  ) => Promise<{ error: Error | null; needsEmailVerification?: boolean }>;
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
          console.error("Error retrieving Supabase session:", error);
        }
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setIsLoading(false);
          if (initialSession) {
            fetchProfile(initialSession).catch((err) =>
              console.warn("Background profile fetch:", err)
            );
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
        setIsLoading(false);
        if (newSession) {
          fetchProfile(newSession).catch((err) =>
            console.warn("Background profile fetch:", err)
          );
        } else {
          setProfile(null);
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("sp_user_profile");
          }
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName || email.split("@")[0],
            role: role,
          },
        },
      });
      if (error) {
        return { error };
      }
      let activeSession = data.session;
      if (!activeSession) {
        // Since emails are auto-confirmed via trigger, establish active session immediately
        const signinRes = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signinRes.data?.session) {
          activeSession = signinRes.data.session;
        }
      }

      if (activeSession) {
        setSession(activeSession);
        setUser(activeSession.user);
        await fetchProfile(activeSession);
      }
      return { error: null, needsEmailVerification: false };
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
      const redirectTo = typeof window !== "undefined"
        ? `${window.location.origin}/auth/reset-password`
        : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
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
        signIn,
        signUp,
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
