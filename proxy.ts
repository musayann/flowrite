// NOTE: in Next.js 16 the `middleware` convention is renamed to `proxy`.
// This re-exports the NextAuth `auth` wrapper as the proxy function so every
// matched request is gated by the `authorized` callback in `auth.ts`.
export { auth as proxy } from "@/auth";

export const config = {
  // Gate page routes. We exclude /api so the proxy never intercepts NextAuth's
  // own /api/auth/* endpoints (sign-in callback, csrf, session). API routes
  // that need protection enforce it in-handler via `auth()` (see
  // app/api/analyze/route.ts), which returns a proper JSON 401 instead of an
  // HTML redirect. Static assets and the image optimizer are also excluded.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
