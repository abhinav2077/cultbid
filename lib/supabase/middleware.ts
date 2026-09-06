import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // API routes handle their own auth (each route calls
  // supabase.auth.getUser() itself, which refreshes the session on its
  // own) — never gate them here. This matters most for
  // /api/razorpay/webhook, which is called by Razorpay's servers with
  // no user session at all; redirecting it to /login would silently
  // break every payment confirmation.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/auth");

  // Only /profile/edit requires being signed in — the leaderboard
  // itself (/) is public, matching "visit the site, see the list,
  // log in only when you actually try to do something that needs it".
  const isProtectedPage = pathname.startsWith("/profile/edit");

  if (!user && isProtectedPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute && !pathname.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
