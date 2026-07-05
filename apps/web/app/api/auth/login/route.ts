import { NextRequest, NextResponse } from "next/server"
import { loginIssuerAdmin } from "@/lib/backend-api/auth"
import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIES,
  createAdminSessionCookie,
  isAuthCookieSecure,
} from "@/lib/auth/session-cookie"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    const identifier = String(
      body?.identifier ?? body?.email ?? body?.username ?? ""
    ).trim()

    const password = String(body?.password ?? "")

    if (!identifier || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Username/email/issuer ID dan password wajib diisi.",
        },
        { status: 400 }
      )
    }

    const result = await loginIssuerAdmin({
      identifier,
      password,
    })

    const accessToken = result.data?.accessToken
    const issuer = result.data?.issuer

    if (!accessToken || !issuer?.issuerId) {
      return NextResponse.json(
        {
          success: false,
          message: "Login berhasil, tetapi token atau data issuer tidak lengkap.",
        },
        { status: 500 }
      )
    }

    const response = NextResponse.json({
      success: true,
      message: "Login berhasil.",
      issuer,
    })
    const isHttps = isAuthCookieSecure()

    response.cookies.set(AUTH_COOKIES.accessToken, accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: AUTH_COOKIE_MAX_AGE,
    })

    response.cookies.set(
      AUTH_COOKIES.adminSession,
      createAdminSessionCookie({
        issuerId: issuer.issuerId,
        organizationName: issuer.organizationName,
        departmentName: issuer.departmentName,
        mspId: issuer.mspId,
        username: issuer.username,
        email: issuer.email,
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: isHttps,
        path: "/",
        maxAge: AUTH_COOKIE_MAX_AGE,
      }
    )

    return response
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Login gagal.",
      },
      { status: 500 }
    )
  }
}
