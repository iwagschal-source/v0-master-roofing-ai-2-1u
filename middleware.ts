// TEMPORARY: Auth disabled for testing - re-enable after OAuth is fixed
// import { withAuth } from "next-auth/middleware"

// export default withAuth({
//   pages: {
//     signIn: "/login",
//   },
// })

export const config = {
  matcher: [
    // Disabled - no routes protected
    // "/((?!login|api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
