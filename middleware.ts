export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    /*
     * Protect all routes except:
     * - /login (auth page)
     * - /api/auth (NextAuth endpoints)
     * - /_next (Next.js internals)
     * - Static files
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
// Force rebuild 1768521991
