/**
 * NextAuth.js Configuration
 *
 * Google OAuth for Master Roofing & Siding employees
 * Restricts access to @masterroofingus.com domain
 */

import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

// Allowed email domains (add more if needed)
const ALLOWED_DOMAINS = ["masterroofingus.com"]

// Admin emails (full access)
const ADMIN_EMAILS = ["iwagschal@masterroofingus.com"]

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          // Request access to Google Workspace APIs
          scope: "openid email profile",
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // Check if email domain is allowed
      const email = user.email?.toLowerCase() || ""
      const domain = email.split("@")[1]

      if (!ALLOWED_DOMAINS.includes(domain)) {
        console.log(`Login rejected: ${email} (domain not allowed)`)
        return false
      }

      console.log(`Login successful: ${email}`)
      return true
    },

    async session({ session, token }) {
      // Add custom fields to session
      if (session.user) {
        session.user.id = token.sub
        session.user.isAdmin = ADMIN_EMAILS.includes(session.user.email?.toLowerCase() || "")
      }
      return session
    },

    async jwt({ token, user, account }) {
      // Persist user info to token
      if (user) {
        token.id = user.id
      }
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
  },

  pages: {
    signIn: "/login",
    error: "/login", // Redirect to login page on error
  },

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },

  secret: process.env.NEXTAUTH_SECRET,
}

// Type augmentation for session
declare module "next-auth" {
  interface Session {
    user: {
      id?: string
      name?: string | null
      email?: string | null
      image?: string | null
      isAdmin?: boolean
    }
  }
}
