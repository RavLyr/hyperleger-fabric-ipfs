import { isAdminRole, ROLES, type AdminRole } from "./roles"

export const AUTH_COOKIES = {
  accessToken: "backend_access_token",
  adminSession: "admin_session",
} as const

export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 12

export function isAuthCookieSecure() {
  const isHttps =
    process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false

  return isHttps
}

export type AdminSessionData = {
  role: AdminRole
  issuerId?: string
  organizationName?: string
  departmentName?: string
  mspId?: string
  username?: string
  email?: string
}

export type AuthSession = {
  accessToken: string
  role: AdminRole
  issuerId?: string
  organizationName?: string
  departmentName?: string
  mspId?: string
  username?: string
  email?: string
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function parseJsonCookie(value: string): unknown {
  const candidates = [value]

  try {
    const decodedValue = decodeURIComponent(value)

    if (decodedValue !== value) {
      candidates.push(decodedValue)
    }
  } catch {
    // Keep the original value as the only parse candidate.
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch {
      // Try the next representation.
    }
  }

  return null
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const payloadSegment = token.split(".")[1]

  if (!payloadSegment) {
    return null
  }

  try {
    const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/")
    const paddingLength = (4 - (normalized.length % 4)) % 4
    const padded = normalized.padEnd(normalized.length + paddingLength, "=")
    const payload = JSON.parse(atob(padded))

    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      return payload as Record<string, unknown>
    }
  } catch {
    return null
  }

  return null
}

export function isAccessTokenValid(accessToken: unknown) {
  const token = asOptionalString(accessToken)

  if (!token) {
    return false
  }

  const payload = decodeJwtPayload(token)

  if (!payload) {
    return false
  }

  if (typeof payload.exp === "number") {
    return Date.now() < payload.exp * 1000
  }

  return true
}

export function createAdminSessionCookie(
  issuer: Omit<AdminSessionData, "role"> & { issuerId: string }
) {
  return JSON.stringify({
    role: ROLES.ISSUER_ADMIN,
    issuerId: issuer.issuerId,
    organizationName: issuer.organizationName,
    departmentName: issuer.departmentName,
    mspId: issuer.mspId,
    username: issuer.username,
    email: issuer.email,
  } satisfies AdminSessionData)
}

export function parseAdminSessionCookie(value: unknown): AdminSessionData | null {
  if (typeof value !== "string" || !value) {
    return null
  }

  const parsedSession = parseJsonCookie(value)

  if (
    !parsedSession ||
    typeof parsedSession !== "object" ||
    Array.isArray(parsedSession)
  ) {
    return null
  }

  const session = parsedSession as Record<string, unknown>

  if (!isAdminRole(session.role)) {
    return null
  }

  const issuerId = asOptionalString(session.issuerId)

  if (session.role === ROLES.ISSUER_ADMIN && !issuerId) {
    return null
  }

  return {
    role: session.role,
    issuerId,
    organizationName: asOptionalString(session.organizationName),
    departmentName: asOptionalString(session.departmentName),
    mspId: asOptionalString(session.mspId),
    username: asOptionalString(session.username),
    email: asOptionalString(session.email),
  }
}

export function getValidAuthSession(input: {
  accessToken?: string
  adminSession?: string
}): AuthSession | null {
  const accessToken = asOptionalString(input.accessToken)

  if (!accessToken || !isAccessTokenValid(accessToken)) {
    return null
  }

  const adminSession = parseAdminSessionCookie(input.adminSession)

  if (!adminSession) {
    return null
  }

  return {
    accessToken,
    ...adminSession,
  }
}
