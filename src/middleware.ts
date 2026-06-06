import { NextResponse, type NextRequest } from "next/server";
import { updateSession, DEFAULT_ACCESS_TOKEN_COOKIE } from "@insforge/sdk/ssr";

export const runtime = "nodejs";

// Public routes: landing, auth pages, the auth API, and the CLI API (which
// authenticates via its own bearer token, not an InsForge session cookie).
const PUBLIC_PREFIXES = ["/sign-in", "/sign-up", "/api/cli", "/api/auth", "/api/cron"];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

type UpdateSessionArgs = Parameters<typeof updateSession>[0];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  // Refresh the session (if needed) so Server Components see fresh cookies.
  // Next's cookie stores are structurally compatible at runtime but typed
  // differently from the SDK's CookieStore, so we bridge the types here.
  const result = await updateSession({
    requestCookies: request.cookies as unknown as UpdateSessionArgs["requestCookies"],
    responseCookies: response.cookies as unknown as UpdateSessionArgs["responseCookies"],
  });

  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return response;

  const authed =
    Boolean(result.accessToken) ||
    Boolean(request.cookies.get(DEFAULT_ACCESS_TOKEN_COOKIE)?.value);

  if (!authed) {
    const url = request.nextUrl.clone();
    const returnTo = `${pathname}${request.nextUrl.search}`;
    url.pathname = "/sign-in";
    url.search = "";
    url.searchParams.set("redirect", returnTo);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
