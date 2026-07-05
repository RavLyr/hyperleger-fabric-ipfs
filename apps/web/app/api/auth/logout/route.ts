import { NextResponse } from "next/server"
import { AUTH_COOKIES } from "@/lib/auth/session-cookie"

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

  for (const cookieName of cookieNames) {
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    })
  }

  return response
}
