import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";

// ponytail: in-memory, single-instance only. Upgrade to Upstash if multi-instance.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();

  // Periodically prune expired entries on each request sweep
  for (const [k, v] of rateLimitStore.entries()) {
    if (v.resetAt <= now) {
      rateLimitStore.delete(k);
    }
  }

  const record = rateLimitStore.get(key);

  if (!record || record.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (record.count >= limit) {
    const retryAfter = Math.max(1, Math.floor((record.resetAt - now) / 1000));
    return { allowed: false, retryAfter };
  }

  record.count += 1;
  return { allowed: true, retryAfter: 0 };
}

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // 1. Dashboard protection
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", req.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Auth API rate limiting: 10 attempts per 15 minutes by IP
  if (pathname.startsWith("/api/auth")) {
    const { allowed, retryAfter } = checkRateLimit(
      `auth:${ip}`,
      10,
      15 * 60 * 1000,
    );
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message:
              "Too many authentication attempts. Please try again later.",
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        },
      );
    }
  }

  // 3. Files API auth check & rate limiting: 120 requests per 60s
  if (pathname.startsWith("/api/files")) {
    if (!isAuthenticated) {
      return apiError("UNAUTHENTICATED", "Authentication required");
    }

    const rateKey = `files:${req.auth?.user?.id ?? ip}`;
    const { allowed, retryAfter } = checkRateLimit(rateKey, 120, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many file requests. Please slow down.",
          },
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        },
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/files/:path*",
    "/api/auth/:path*",
  ],
};
