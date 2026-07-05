import { NextResponse } from "next/server"
import { AUTH_COOKIES, isAuthCookieSecure } from "@/lib/auth/session-cookie"

export const runtime = "nodejs"

const cookieNames = [
  AUTH_COOKIES.accessToken,
  AUTH_COOKIES.adminSession,
] as const

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Logout berhasil.",
  })
  const isHttps = isAuthCookieSecure()

  for (const cookieName of cookieNames) {
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: 0,
    })
  }

  return response
}
