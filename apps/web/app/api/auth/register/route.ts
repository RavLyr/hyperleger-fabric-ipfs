import { NextResponse } from "next/server"

export const runtime = "nodejs"

function getBackendBaseUrl() {
  const baseUrl = process.env.BACKEND_BASE_URL

  if (!baseUrl) {
    throw new Error("BACKEND_BASE_URL is not set.")
  }

  return baseUrl.replace(/\/$/, "")
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // We can do light validation here or let the backend handle it.
    // We will just forward it to the backend.

    const response = await fetch(`${getBackendBaseUrl()}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    })

    const result = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        result,
        { status: response.status }
      )
    }

    return NextResponse.json(
      result,
      { status: response.status }
    )
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "An error occurred during issuer registration.",
      },
      { status: 500 }
    )
  }
}