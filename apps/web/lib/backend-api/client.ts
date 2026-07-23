type BackendFetchOptions = {
  auth?: boolean
}

type BackendErrorResponse = {
  success?: boolean
  message?: string
  data?: unknown
  error?: {
    message?: string
  }
}

export class BackendApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = "BackendApiError"
  }
}

function getBackendBaseUrl() {
  const baseUrl =
    process.env.BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
    "http://localhost:3000"

  return baseUrl.replace(/\/$/, "")
}

function getClientCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"))
  return match ? decodeURIComponent(match[2]) : undefined
}

export async function backendFetch<T = BackendErrorResponse>(
  path: string,
  init: RequestInit = {},
  options: BackendFetchOptions = {}
): Promise<T> {
  const headers = new Headers(init.headers)

  const shouldUseAuth = options.auth ?? true

  if (shouldUseAuth) {
    let token: string | undefined

    if (typeof window === "undefined") {
      // Server-side (Node.js environment)
      const { cookies } = await import("next/headers")
      const cookieStore = await cookies()
      token = cookieStore.get("backend_access_token")?.value
    } else {
      // Client-side (Browser environment)
      token = getClientCookie("backend_access_token")
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }
  }

  const response = await fetch(`${getBackendBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  })

  const result = (await response.json().catch(() => null)) as
    | BackendErrorResponse
    | T
    | null

  const errorResult = result as BackendErrorResponse | null

  if (!response.ok || errorResult?.success === false) {
    throw new BackendApiError(
      errorResult?.error?.message ||
        errorResult?.message ||
        "Request ke backend gagal.",
      response.status
    )
  }

  return result as T
}
