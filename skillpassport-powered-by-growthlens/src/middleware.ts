import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://igsiwwztcxliwbuylshn.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_YCS6fNh8EvPONKjFxnVb2Q_e8Uq4WVh";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Authoritatively re-validate user token with Supabase Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected application routes (/app/*)
  if (pathname.startsWith("/app")) {
    if (!user) {
      // Anonymous user cannot access protected areas
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
      return NextResponse.redirect(redirectUrl);
    }

    // Verify email confirmation status
    const isConfirmed = Boolean(user.email_confirmed_at || (user as any).confirmed_at);
    if (!isConfirmed) {
      // Unverified user cannot access the wizard or app workspaces
      const verifyUrl = new URL("/auth/verify-email", request.url);
      verifyUrl.searchParams.set("status", "unverified");
      if (user.email) {
        verifyUrl.searchParams.set("email", user.email);
      }
      return NextResponse.redirect(verifyUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, icons, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
