import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: [
    /*
     * Protect all routes except:
     * - /login (auth page)
     * - /api/* (all API routes - they handle their own auth)
     * - /_next (Next.js internals)
     * - Static files
     */
    "/((?!login|api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
