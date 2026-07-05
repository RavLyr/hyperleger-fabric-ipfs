import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ROLES } from "./roles"
import {
  AUTH_COOKIES,
  getValidAuthSession,
  type AdminSessionData,
  type AuthSession,
} from "./session-cookie"

export type { AdminSessionData, AuthSession }

export async function getAuthSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies()

  return getValidAuthSession({
    accessToken: cookieStore.get(AUTH_COOKIES.accessToken)?.value,
    adminSession: cookieStore.get(AUTH_COOKIES.adminSession)?.value,
  })
}

export async function requireAdminSession() {
  const session = await getAuthSession()

  if (!session) {
    redirect("/login?callbackUrl=/admin/ijazah")
  }

  return session
}

export function getIssuerScope(session: AuthSession): string | undefined {
  if (session.role === ROLES.ISSUER_ADMIN) {
    return session.issuerId
  }

  return undefined
}
