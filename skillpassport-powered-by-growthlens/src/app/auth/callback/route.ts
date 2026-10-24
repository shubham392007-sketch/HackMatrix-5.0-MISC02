import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function sanitizeNextUrl(rawNext: string | null): string {
  if (!rawNext) return "/app/onboarding";
  // Enforce relative path, prevent protocol-relative (//) and javascript: URLs
  if (rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("\\")) {
    return rawNext;
  }
  return "/app/onboarding";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams, origin } = requestUrl;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const rawNext = searchParams.get("next");
  const errorParam = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  const safeNext = sanitizeNextUrl(rawNext);

  // 1. Handle incoming Supabase error parameters (e.g. expired link, invalid token)
  if (errorParam || errorCode) {
    const desc = errorDescription || "";
    const isExpired =
      errorCode === "otp_expired" ||
      errorParam === "access_denied" ||
      desc.toLowerCase().includes("expired") ||
      desc.toLowerCase().includes("already");

    const statusParam = isExpired ? "expired" : "invalid";
    return NextResponse.redirect(
      `${origin}/auth/verify-email?status=${statusParam}&message=${encodeURIComponent(
        desc || "Verification link failed or expired"
      )}`
    );
  }

  const supabase = await createClient();

  // 2. Handle PKCE authorization code exchange
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      const msg = exchangeError.message || "";
      const isExpired =
        msg.toLowerCase().includes("expired") ||
        msg.toLowerCase().includes("invalid") ||
        exchangeError.status === 400;
      return NextResponse.redirect(
        `${origin}/auth/verify-email?status=${isExpired ? "expired" : "invalid"}&message=${encodeURIComponent(
          msg
        )}`
      );
    }
  } else if (tokenHash && type) {
    // 3. Handle Token Hash (OTP) verification
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any,
    });
    if (otpError) {
      const msg = otpError.message || "";
      const isExpired =
        msg.toLowerCase().includes("expired") ||
        msg.toLowerCase().includes("invalid") ||
        otpError.status === 400;
      return NextResponse.redirect(
        `${origin}/auth/verify-email?status=${isExpired ? "expired" : "invalid"}&message=${encodeURIComponent(
          msg
        )}`
      );
    }
  }

  // 4. Verify authoritative session and confirm account is genuinely verified
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(
      `${origin}/auth/verify-email?status=invalid&message=No+valid+authenticated+session+established`
    );
  }

  const isConfirmed = Boolean(user.email_confirmed_at || (user as any).confirmed_at);
  if (!isConfirmed) {
    return NextResponse.redirect(
      `${origin}/auth/verify-email?status=unverified&email=${encodeURIComponent(user.email || "")}`
    );
  }

  // 5. Inspect user's persistent profile to route correctly to onboarding vs dashboard
  let finalDestination = safeNext;
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      const profileResp = await fetch(`${backendUrl.replace(/\/$/, "")}/api/v1/profile/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (profileResp.ok) {
        const profile = await profileResp.json();
        if (profile.onboarding_status === "completed") {
          // User already completed onboarding - do not force back into the wizard
          finalDestination = safeNext === "/app/onboarding" ? "/app/evidence" : safeNext;
        } else {
          // Eligible new user enters onboarding
          finalDestination = "/app/onboarding";
        }
      }
    }
  } catch (e) {
    console.warn("Could not inspect user profile onboarding status in auth callback:", e);
  }

  // 6. Direct user through the verified success confirmation page before entering the wizard
  return NextResponse.redirect(
    `${origin}/auth/verify-email?status=success&next=${encodeURIComponent(finalDestination)}`
  );
}
