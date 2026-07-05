import { NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth/session"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await getAuthSession()

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Authenticated.",
      data: {
        role: session.role,
        issuerId: session.issuerId ?? null,
        organizationName: session.organizationName ?? null,
        departmentName: session.departmentName ?? null,
        mspId: session.mspId ?? null,
        username: session.username ?? null,
        email: session.email ?? null,
      },
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat membaca session.",
      },
      { status: 500 }
    )
  }
}
