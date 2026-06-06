import { timingSafeEqual } from "node:crypto";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  checkRateLimit,
  recordFailure,
  recordSuccess,
} from "@/lib/rate-limit";

/**
 * Single-user authentication.
 *
 * There is exactly one account, defined by the AUTH_USERNAME / AUTH_PASSWORD
 * environment variables. `authorize()` only ever *validates* a submitted login
 * against those values — it never creates users, so self-registration is
 * impossible by construction. Sessions are stateless JWTs, so no database is
 * needed.
 */

/**
 * Thrown when an IP is temporarily locked out by the brute-force throttle.
 * The `code` is surfaced as `?code=rate_limited` on the login redirect so the
 * UI can show a distinct message instead of "invalid credentials".
 */
class RateLimitError extends CredentialsSignin {
  code = "rate_limited";
}

/**
 * Best-effort client IP for rate-limiting, read from the proxy headers a
 * self-hosted deploy sets. Falls back to a shared bucket so that requests we
 * can't attribute still can't brute-force unthrottled.
 */
function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Constant-time string comparison that doesn't leak length via early return. */
function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    // Compare against self to keep timing roughly constant, then fail.
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials, request) {
        const expectedUser = process.env.AUTH_USERNAME;
        const expectedPass = process.env.AUTH_PASSWORD;
        if (!expectedUser || !expectedPass) {
          throw new Error(
            "AUTH_USERNAME and AUTH_PASSWORD must be set in the environment.",
          );
        }

        // Throttle brute-force attempts by client IP before doing any work.
        const ip = clientIp(request);
        if (checkRateLimit(ip).limited) {
          throw new RateLimitError();
        }

        const username =
          typeof credentials?.username === "string" ? credentials.username : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        // Evaluate both comparisons so a wrong username and a wrong password
        // take a similar amount of work.
        const userOk = safeEqual(username, expectedUser);
        const passOk = safeEqual(password, expectedPass);
        if (userOk && passOk) {
          recordSuccess(ip);
          return { id: "1", name: expectedUser };
        }

        // Count the failure; if this trips the limit, surface it immediately.
        if (recordFailure(ip).limited) {
          throw new RateLimitError();
        }
        return null;
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      if (isOnLogin) {
        return isLoggedIn
          ? Response.redirect(new URL("/", nextUrl))
          : true;
      }
      // There's only one destination (the main page), so redirect to /login
      // explicitly instead of returning `false`, which would append an unused
      // ?callbackUrl param.
      return isLoggedIn
        ? true
        : Response.redirect(new URL("/login", nextUrl));
    },
  },
});
