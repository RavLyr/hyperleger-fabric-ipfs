import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getBackendBaseUrl() {
  const baseUrl = process.env.BACKEND_BASE_URL

  if (!baseUrl) {
    throw new Error("BACKEND_BASE_URL belum diset.")
  }

  return baseUrl.replace(/\/$/, "")
}

export async function GET() {
  try {
    const response = await fetch(`${getBackendBaseUrl()}/health`, {
      method: "GET",
      cache: "no-store",
    })

    const data = await response.json().catch(() => null)

    return NextResponse.json(
      {
        success: response.ok,
        message: response.ok
          ? "FE berhasil hit backend."
          : "FE gagal hit backend.",
        backendStatus: response.status,
        data,
      },
      { status: response.ok ? 200 : response.status }
    )
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "FE tidak bisa menghubungi backend.",
      },
      { status: 500 }
    )
  }
}