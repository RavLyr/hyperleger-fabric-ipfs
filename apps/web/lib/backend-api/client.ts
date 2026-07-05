import { cookies } from "next/headers"

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

function getBackendBaseUrl() {
  const baseUrl = process.env.BACKEND_BASE_URL

  if (!baseUrl) {
    throw new Error("BACKEND_BASE_URL belum diset.")
  }

  return baseUrl.replace(/\/$/, "")
}

export async function backendFetch<T = BackendErrorResponse>(
  path: string,
  init: RequestInit = {},
  options: BackendFetchOptions = {}
): Promise<T> {
  const headers = new Headers(init.headers)

  const shouldUseAuth = options.auth ?? true

  if (shouldUseAuth) {
    const cookieStore = await cookies()
    const token = cookieStore.get("backend_access_token")?.value

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
    throw new Error(
      errorResult?.error?.message ||
        errorResult?.message ||
        "Request ke backend gagal."
    )
  }

  return result as T
}
