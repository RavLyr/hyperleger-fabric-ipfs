import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { AUTH_COOKIES, getValidAuthSession } from "@/lib/auth/session-cookie"

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAdminRoute = pathname.startsWith("/admin")
  const session = getValidAuthSession({
    accessToken: request.cookies.get(AUTH_COOKIES.accessToken)?.value,
    adminSession: request.cookies.get(AUTH_COOKIES.adminSession)?.value,
  })

  if (isAdminRoute) {
    if (!session) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set(
        "callbackUrl",
        `${pathname}${request.nextUrl.search}`
      )

      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
