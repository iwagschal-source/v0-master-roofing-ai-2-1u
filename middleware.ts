import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

// Routes that don't require authentication
const publicRoutes = [
  "/login",
  "/api/auth",
]

// Routes that should be accessible without auth (static assets, etc.)
const publicPrefixes = [
  "/_next",
  "/favicon",
  "/icon",
  "/apple-icon",
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public prefixes (static assets)
  if (publicPrefixes.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check for auth token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Redirect to login if not authenticated
  if (!token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
