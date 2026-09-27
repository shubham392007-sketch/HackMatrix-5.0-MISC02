"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: "EMPLOYEE" | "MANAGER" | "ADMIN";
  organization_id?: string;
  job_title?: string;
  department?: string;
  avatar_url?: string;
  onboarding_completed: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: "EMPLOYEE" | "MANAGER" | "ADMIN" | null;
  loading: boolean;
  authenticated: boolean;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  signup: (
    email: string,
    password: string,
    fullName: string,
    role: "EMPLOYEE" | "MANAGER"
  ) => Promise<{ error: Error | null; emailConfirmationRequired: boolean }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (u: User, s: Session): Promise<UserProfile | null> => {
    try {
      // 1. Try FastAPI backend /api/profile/me
      const res = await fetch("/api/profile/me", {
        headers: {
          Authorization: `Bearer ${s.access_token}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        const p: UserProfile = await res.json();
        return p;
      }
    } catch {
      // Backend may be loading or proxying, fallback to direct Supabase query
    }

    try {
      // 2. Query Supabase directly
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", u.id)
        .maybeSingle();

      if (data && !error) {
        return {
          id: data.id,
          user_id: data.user_id,
          full_name: data.full_name || u.user_metadata?.full_name || u.email?.split("@")[0] || "User",
          email: data.email || u.email || "",
          role: (data.role || u.user_metadata?.role || "EMPLOYEE").toUpperCase() as "EMPLOYEE" | "MANAGER" | "ADMIN",
          organization_id: data.organization_id,
          job_title: data.job_title,
          department: data.department,
          avatar_url: data.avatar_url,
          onboarding_completed: Boolean(data.onboarding_completed),
        };
      }
    } catch (e) {
      console.warn("Could not retrieve profile directly from Supabase:", e);
    }

    // 3. Fallback: synthesize profile from auth session metadata
    const userRole = (u.user_metadata?.role || "EMPLOYEE").toUpperCase() as "EMPLOYEE" | "MANAGER" | "ADMIN";
    return {
      id: u.id,
      user_id: u.id,
      full_name: u.user_metadata?.full_name || u.email?.split("@")[0] || "GrowthLens User",
      email: u.email || "",
      role: userRole,
      onboarding_completed: false,
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          if (initialSession?.user) {
            const p = await fetchProfile(initialSession.user, initialSession);
            if (mounted) setProfile(p);
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          const p = await fetchProfile(newSession.user, newSession);
          if (mounted) setProfile(p);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return { error };

      if (data.session && data.user) {
        setSession(data.session);
        setUser(data.user);
        const p = await fetchProfile(data.user, data.session);
        setProfile(p);
      }
      return { error: null };
    } catch (e: any) {
      return { error: e };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    fullName: string,
    role: "EMPLOYEE" | "MANAGER"
  ) => {
    setLoading(true);
    const cleanEmail = email.trim();
    try {
      // 1. Primary: Use backend admin registration to bypass Supabase SMTP 429 rate-limiting
      try {
        const resp = await fetch("/api/auth/register-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fullName.trim(),
            email: cleanEmail,
            password,
            role: role.toUpperCase(),
          }),
        });

        if (resp.ok) {
          // Immediately sign in with the new confirmed user
          const signInRes = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (signInRes.data.session && signInRes.data.user) {
            setSession(signInRes.data.session);
            setUser(signInRes.data.user);
            const p = await fetchProfile(signInRes.data.user, signInRes.data.session);
            setProfile(p);
            return { error: null, emailConfirmationRequired: false };
          }
        } else {
          const errData = await resp.json().catch(() => ({}));
          if (resp.status === 400 && errData.detail?.includes("already exists")) {
            return { error: new Error(errData.detail), emailConfirmationRequired: false };
          }
        }
      } catch (backendErr) {
        console.warn("Backend registration fallback to direct Supabase Auth:", backendErr);
      }

      // 2. Fallback: Direct Supabase client sign up
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: role.toUpperCase(),
          },
        },
      });
      if (error) {
        if (error.message?.includes("rate limit") || (error as any).status === 429) {
          return {
            error: new Error("Supabase email rate limit reached. Please try logging in or wait a few minutes."),
            emailConfirmationRequired: false,
          };
        }
        return { error, emailConfirmationRequired: false };
      }

      const emailConfirmationRequired = !data.session;
      if (data.session && data.user) {
        setSession(data.session);
        setUser(data.user);
        const p = await fetchProfile(data.user, data.session);
        setProfile(p);
      }
      return { error: null, emailConfirmationRequired };
    } catch (e: any) {
      return { error: e, emailConfirmationRequired: false };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user && session) {
      const p = await fetchProfile(user, session);
      setProfile(p);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role: profile?.role ?? null,
        loading,
        authenticated: !!session && !!user,
        login,
        signup,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
