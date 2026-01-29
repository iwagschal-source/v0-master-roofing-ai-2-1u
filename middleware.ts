// TEMPORARY: Auth disabled for testing - re-enable after OAuth is fixed
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// No-op middleware - allows all requests through
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Disabled - no routes protected
  ],
}
